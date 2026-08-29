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

  const creditedNow = Boolean((data as any)?.credited ?? true);
  const duplicate = Boolean((data as any)?.duplicate);

  await admin
    .from('zapupi_deposits')
    .update({
      credited_at: new Date().toISOString(),
      last_verify_error: null,
      next_verify_at: null,
      last_verify_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);

  if (creditedNow && !duplicate) {
    await afterDepositCredited({
      admin,
      orderId,
      userId: dep.user_id,
      amountInr: expected,
      utr: verify.utr ?? null,
      txnId: verify.txn_id ?? null,
      eventKey,
      source,
      creditResult: data,
      gatewayRaw: verify.raw,
    });
  }

  return {
    ok: true,
    credited: creditedNow,
    already: duplicate,
    status: 'completed',
  };
}

/**
 * Post-credit side effects: in-app notification, email receipt and an audit
 * record carrying the gateway response + idempotency reference for disputes.
 * Never throws — a failed notification must not undo a successful credit.
 */
async function afterDepositCredited(args: {
  admin: any;
  orderId: string;
  userId: string;
  amountInr: number;
  utr: string | null;
  txnId: string | null;
  eventKey: string;
  source: string;
  creditResult: any;
  gatewayRaw: unknown;
}): Promise<void> {
  const { admin, orderId, userId, amountInr, utr, txnId, eventKey, source } = args;
  const creditedAt = new Date();

  // 1. Audit trail (dispute-ready)
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();

    await admin.from('admin_audit_log').insert({
      action: 'wallet_credit_upi',
      target_user_id: userId,
      target_email: profile?.email ?? null,
      amount_inr: amountInr,
      notes: `UPI deposit ${orderId} credited (UTR ${utr ?? 'n/a'})`,
      metadata: {
        order_id: orderId,
        utr,
        txn_id: txnId,
        source,
        idempotency_key: eventKey,
        credit_result: args.creditResult ?? null,
        gateway_response: args.gatewayRaw ?? null,
      },
    });
  } catch (err) {
    console.error('[zapupi] audit insert failed', err);
  }

  // 2. In-app notification
  try {
    await admin.from('notifications').insert({
      user_id: userId,
      title: `₹${amountInr.toFixed(2)} added to your wallet`,
      body: `UPI payment confirmed${utr ? ` (UTR ${utr})` : ''}. Your balance has been updated.`,
      link: '/wallet',
    });
  } catch (err) {
    console.error('[zapupi] notification insert failed', err);
  }

  // 3. Email receipt
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    const email = profile?.email as string | undefined;
    if (email) {
      const { data: wallet } = await admin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      const { sendTemplateEmail } = await import('@/lib/email-templates/send-email');
      await sendTemplateEmail('deposit-credited', email, {
        idempotencyKey: `deposit-credited-${orderId}`,
        templateData: {
          amountInr: amountInr.toFixed(2),
          orderId,
          utr: utr ?? '—',
          txnId: txnId ?? '—',
          creditedAt: creditedAt.toUTCString(),
          balanceInr: wallet?.balance != null ? Number(wallet.balance).toFixed(2) : '',
          walletUrl: 'https://flexipro.in/wallet',
        },
      });
    }
  } catch (err) {
    console.error('[zapupi] receipt email failed', err);
  }
}


/** Exponential backoff between verification attempts (minutes). */
const BACKOFF_MINUTES = [0.5, 1, 2, 5, 10, 20, 30, 60];
const MAX_VERIFY_ATTEMPTS = 40;

function backoffFor(attempt: number): number {
  const idx = Math.min(attempt, BACKOFF_MINUTES.length - 1);
  return (BACKOFF_MINUTES[idx] ?? 60) * 60_000;
}

/**
 * Auto-settle: picks recent uncredited deposits whose next retry is due,
 * verifies them against the gateway, credits the wallet when confirmed and
 * records the exact failure reason + next retry time on every miss.
 * Bounded per run so the scheduler never fans out.
 */
export async function settlePendingZapupiDeposits(limit = 25): Promise<{
  checked: number;
  credited: number;
  mismatched: number;
  results: Array<{
    order_id: string;
    credited?: boolean;
    status?: string;
    mismatch?: boolean;
    error?: string;
    next_verify_at?: string;
  }>;
}> {
  const admin = await getAdmin();
  const nowIso = new Date().toISOString();
  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: rows } = await admin
    .from('zapupi_deposits')
    .select('order_id, created_at, verify_attempts, next_verify_at')
    .eq('credited', false)
    .in('status', ['pending', 'processing'])
    .gte('created_at', cutoff)
    .lt('verify_attempts', MAX_VERIFY_ATTEMPTS)
    .or(`next_verify_at.is.null,next_verify_at.lte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  const results: Array<{
    order_id: string;
    credited?: boolean;
    status?: string;
    mismatch?: boolean;
    error?: string;
    next_verify_at?: string;
  }> = [];
  let credited = 0;
  let mismatched = 0;

  for (const row of (rows ?? []) as Array<{ order_id: string; verify_attempts: number | null }>) {
    const attempt = Number(row.verify_attempts ?? 0);
    const nextAt = new Date(Date.now() + backoffFor(attempt)).toISOString();

    try {
      const r = await settleZapupiOrder({
        orderId: row.order_id,
        payload: { source: 'auto', order_id: row.order_id, at: new Date().toISOString() },
        source: 'sync',
      });

      if (r.credited) credited += 1;
      if (r.mismatch) mismatched += 1;

      if (!r.credited && !r.mismatch) {
        await admin
          .from('zapupi_deposits')
          .update({
            verify_attempts: attempt + 1,
            last_verify_at: new Date().toISOString(),
            last_verify_error: r.error ?? (r.verified === false ? 'Gateway reports payment not completed yet' : null),
            next_verify_at: nextAt,
          })
          .eq('order_id', row.order_id);
      }

      results.push({
        order_id: row.order_id,
        credited: r.credited,
        status: r.status,
        mismatch: r.mismatch,
        ...(r.error ? { error: r.error } : {}),
        next_verify_at: r.credited ? undefined : nextAt,
      });
    } catch (err: any) {
      const message = String(err?.message ?? err);
      await admin
        .from('zapupi_deposits')
        .update({
          verify_attempts: attempt + 1,
          last_verify_at: new Date().toISOString(),
          last_verify_error: `Gateway error: ${message}`.slice(0, 500),
          next_verify_at: nextAt,
        })
        .eq('order_id', row.order_id);
      console.error('[zapupi] auto-verify failed', row.order_id, message);
      results.push({ order_id: row.order_id, status: 'error', error: message, next_verify_at: nextAt });
    }
  }

  return { checked: (rows ?? []).length, credited, mismatched, results };
}

/** Full verification timeline for one deposit (owner-scoped read done by caller). */
export async function getDepositTimeline(orderId: string): Promise<{
  deposit: any | null;
  events: Array<{
    at: string;
    source: string | null;
    status: string | null;
    utr: string | null;
    txn_id: string | null;
    processed: boolean | null;
    amount_match: boolean | null;
    note: string | null;
  }>;
}> {
  const admin = await getAdmin();

  const { data: deposit } = await admin
    .from('zapupi_deposits')
    .select(
      'order_id, user_id, amount_inr, status, credited, credited_at, utr, txn_id, verify_attempts, last_verify_at, last_verify_error, next_verify_at, created_at, updated_at',
    )
    .eq('order_id', orderId)
    .maybeSingle();

  const { data: events } = await admin
    .from('zapupi_webhook_events')
    .select('received_at, source, status, utr, txn_id, processed, amount_match, credit_result, verification_notes')
    .eq('order_id', orderId)
    .order('received_at', { ascending: true })
    .limit(50);

  return {
    deposit: deposit ?? null,
    events: ((events ?? []) as any[]).map((e) => ({
      at: e.received_at,
      source: e.source ?? null,
      status: e.status ?? null,
      utr: e.utr ?? null,
      txn_id: e.txn_id ?? null,
      processed: e.processed ?? null,
      amount_match: e.amount_match ?? null,
      note: e.credit_result?.error ?? (e.processed ? 'Wallet credited' : null),
    })),
  };
}

