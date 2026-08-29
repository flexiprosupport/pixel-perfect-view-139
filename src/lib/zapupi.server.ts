/**
 * ZapUPI server-only helpers.
 * Never imported by client code — only from server functions / server routes.
 */

const ZAP_BASE = 'https://pay.zapupi.com/api';

export function getZapKey(): string {
  const key = process.env['ZAPUPI_API_KEY'];
  if (!key) throw new Error('ZAPUPI_API_KEY is not configured');
  return key;
}

export async function getAdmin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin as any;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface VerifyResult {
  success: boolean;
  txn_id?: string;
  utr?: string;
  environment?: string;
  paid_amount: number;
  raw: unknown;
}

/** Ask ZapUPI for the authoritative order status. Never trust the webhook body. */
export async function verifyOrder(orderId: string): Promise<VerifyResult> {
  const res = await fetch(`${ZAP_BASE}/order-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ zap_key: getZapKey(), order_id: orderId }),
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  const d = data?.data ?? data;
  const statusStr = String(d?.status ?? data?.status ?? '').toLowerCase();
  const success = statusStr === 'success' || statusStr === 'completed' || statusStr === 'paid';
  const paidRaw = d?.paid_amount ?? d?.amount ?? d?.amount_paid ?? data?.paid_amount ?? data?.amount;
  const paid_amount = paidRaw != null ? Number(String(paidRaw).replace(/[^0-9.]/g, '')) : NaN;
  return {
    success,
    txn_id: d?.txn_id ?? data?.txn_id,
    utr: d?.utr ?? data?.utr,
    environment: d?.environment ?? data?.environment,
    paid_amount,
    raw: data,
  };
}

export interface CreateOrderArgs {
  orderId: string;
  amountInr: number;
  userId: string;
  origin: string;
  customerMobile?: string;
}

export async function createGatewayOrder({
  orderId,
  amountInr,
  userId,
  origin,
  customerMobile,
}: CreateOrderArgs): Promise<{ ok: boolean; paymentUrl?: string; raw: any }> {
  const ret = (status: string) =>
    `${origin}/api/public/zapupi-return?status=${status}&deposit_order_id=${encodeURIComponent(orderId)}`;

  const payload: Record<string, string> = {
    zap_key: getZapKey(),
    order_id: orderId,
    amount: amountInr.toFixed(2),
    webhook_url: `${origin}/api/public/zapupi-webhook`,
    success_url: ret('success'),
    failed_url: ret('failed'),
    timeout_url: ret('timeout'),
    redirect_url: ret('success'),
    remark: `Wallet topup | ${userId}`,
  };
  if (customerMobile && customerMobile.length === 10) payload.customer_mobile = customerMobile;

  const res = await fetch(`${ZAP_BASE}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  const paymentUrl: string | undefined =
    data?.payment_url || data?.data?.payment_url || data?.url || data?.upi_url;
  const statusStr = String(data?.status ?? '').toLowerCase();
  const ok =
    res.ok && (statusStr === 'success' || data?.status === true || data?.success === true || !!paymentUrl);

  return { ok: Boolean(ok && paymentUrl), paymentUrl, raw: data };
}

/**
 * Insert the event row keyed by `event_key`.
 * Unique violation (23505) means this exact callback was already handled → replay.
 */
export async function claimEvent(admin: any, row: Record<string, unknown>): Promise<boolean> {
  const { error } = await admin.from('zapupi_webhook_events').insert(row);
  if (!error) return true;
  if ((error as any)?.code === '23505') return false;
  console.error('[zapupi] claimEvent insert failed', error);
  return false;
}

export interface SettleResult {
  ok: boolean;
  credited?: boolean;
  already?: boolean;
  replay?: boolean;
  mismatch?: boolean;
  verified?: boolean;
  status?: string;
  note?: string;
  error?: string;
}

/**
 * Single source of truth for settling a ZapUPI order.
 * Idempotent: DB-level event claim + `credited` flag + SQL-side duplicate guard.
 */
export async function settleZapupiOrder(opts: {
  orderId: string;
  payload: any;
  source: 'webhook' | 'sync';
  meta?: Record<string, unknown>;
}): Promise<SettleResult> {
  const { orderId, payload, source, meta = {} } = opts;
  const admin = await getAdmin();

  const txn = payload?.txn_id || payload?.data?.txn_id || '';
  const utr = payload?.utr || payload?.data?.utr || '';
  const status = String(payload?.status || payload?.data?.status || '').toLowerCase();
  const payloadHash = await sha256Hex(JSON.stringify(payload ?? {}));
  const eventKey = `${source}:${orderId}:${txn}:${utr}:${status}:${payloadHash}`;

  const claimed = await claimEvent(admin, {
    event_key: eventKey,
    order_id: orderId,
    txn_id: txn || null,
    utr: utr || null,
    status: status || null,
    source,
    payload,
    ...meta,
  });

  const { data: dep } = await admin
    .from('zapupi_deposits')
    .select('user_id, amount_inr, credited, status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!dep) return { ok: true, note: 'unknown order' };
  if (dep.credited) return { ok: true, credited: true, already: true, status: 'completed' };
  if (!claimed) return { ok: true, replay: true, status: dep.status };

  // Authoritative check against the gateway — the webhook body is never trusted.
  const verify = await verifyOrder(orderId);
  if (!verify.success) {
    await admin
      .from('zapupi_deposits')
      .update({ gateway_response: { [source]: payload, verify: verify.raw } })
      .eq('order_id', orderId);
    return { ok: true, verified: false, status: 'pending' };
  }

  const expected = Number(dep.amount_inr);
  const paid = Number(verify.paid_amount);
  const amountMatch = Number.isFinite(paid) && Math.abs(paid - expected) <= 0.01;

  await admin
    .from('zapupi_webhook_events')
    .update({
      expected_amount: expected,
      received_amount: Number.isFinite(paid) ? paid : null,
      amount_match: amountMatch,
      verification_notes: JSON.stringify({
        verify_success: verify.success,
        environment: verify.environment,
        txn_id: verify.txn_id,
        utr: verify.utr,
      }),
    })
    .eq('event_key', eventKey);

  if (!amountMatch) {
    await admin
      .from('zapupi_deposits')
      .update({
        status: 'mismatch',
        gateway_response: { [source]: payload, verify: verify.raw, expected_inr: expected, paid_inr: paid },
      })
      .eq('order_id', orderId);
    return { ok: true, mismatch: true, status: 'mismatch' };
  }

  const { data, error } = await admin.rpc('credit_wallet_zapupi', {
    p_order_id: orderId,
    p_txn_id: verify.txn_id ?? null,
    p_utr: verify.utr ?? null,
    p_gateway_response: { [source]: payload, verify: verify.raw, paid_inr: paid },
  });

  if (error) {
    console.error('[zapupi] credit_wallet_zapupi failed', error);
    await admin
      .from('zapupi_webhook_events')
      .update({ processed: true, credit_result: { error: error.message } })
      .eq('event_key', eventKey);
    return { ok: false, error: error.message, status: 'pending' };
  }

  await admin
    .from('zapupi_webhook_events')
    .update({ processed: true, credit_result: data as any })
    .eq('event_key', eventKey);

  return {
    ok: true,
    credited: Boolean((data as any)?.credited ?? true),
    already: Boolean((data as any)?.duplicate),
    status: 'completed',
  };
}

/**
 * Auto-settle: picks recent uncredited deposits and verifies them against the
 * gateway, crediting the wallet when the payment is confirmed.
 * Runs from the scheduler so users never have to check manually.
 */
export async function settlePendingZapupiDeposits(limit = 25): Promise<{
  checked: number;
  credited: number;
  mismatched: number;
  results: Array<{ order_id: string; credited?: boolean; status?: string; mismatch?: boolean }>;
}> {
  const admin = await getAdmin();
  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: rows } = await admin
    .from('zapupi_deposits')
    .select('order_id, created_at')
    .eq('credited', false)
    .in('status', ['pending', 'processing'])
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit);

  const results: Array<{ order_id: string; credited?: boolean; status?: string; mismatch?: boolean }> = [];
  let credited = 0;
  let mismatched = 0;

  for (const row of (rows ?? []) as Array<{ order_id: string }>) {
    try {
      const r = await settleZapupiOrder({
        orderId: row.order_id,
        payload: { source: 'auto', order_id: row.order_id, at: new Date().toISOString() },
        source: 'sync',
      });
      if (r.credited) credited += 1;
      if (r.mismatch) mismatched += 1;
      results.push({ order_id: row.order_id, credited: r.credited, status: r.status, mismatch: r.mismatch });
    } catch (err: any) {
      results.push({ order_id: row.order_id, status: `error: ${String(err?.message ?? err)}` });
    }
  }

  return { checked: (rows ?? []).length, credited, mismatched, results };
}
