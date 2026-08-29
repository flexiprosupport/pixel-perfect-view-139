import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const MIN_INR = 100;
const MAX_INR = 100000;

const createZapupiOrderSchema = z.object({
  amount_inr: z
    .number({ invalid_type_error: 'Please enter a valid amount in INR.' })
    .min(MIN_INR, { message: `Minimum deposit amount is ₹${MIN_INR}.` })
    .max(MAX_INR, { message: `Maximum deposit amount is ₹${MAX_INR}.` }),
  customer_mobile: z.string().max(10).optional(),
});

function resolveOrigin(): string {
  const explicit = process.env['PUBLIC_SITE_URL'];
  if (explicit) return explicit.replace(/\/$/, '');
  const origin = getRequestHeader('origin');
  if (origin) return origin.replace(/\/$/, '');
  const host = getRequestHeader('x-forwarded-host') || getRequestHeader('host');
  const proto = getRequestHeader('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : '';
}

/** Create a ZapUPI order + a `pending` deposit row, return the hosted payment URL. */
export const createZapupiOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createZapupiOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getAdmin, createGatewayOrder } = await import('./zapupi.server');
    const userId = context.userId as string;

    const amountInr = Math.round(data.amount_inr * 100) / 100;
    const orderId = 'ZAP_' + crypto.randomUUID().replace(/-/g, '');
    const origin = resolveOrigin();


    const admin = await getAdmin();
    const { error: insErr } = await admin.from('zapupi_deposits').insert({
      user_id: userId,
      order_id: orderId,
      amount_inr: amountInr,
      status: 'pending',
    });
    if (insErr) {
      console.error('[zapupi] deposit insert failed', insErr);
      return { ok: false as const, error: 'Could not create the deposit. Please try again.' };
    }

    try {
      const gw = await createGatewayOrder({
        orderId,
        amountInr,
        userId,
        origin,
        customerMobile: String(data?.customer_mobile ?? '').replace(/\D/g, '').slice(-10),
      });

      if (!gw.ok || !gw.paymentUrl) {
        await admin
          .from('zapupi_deposits')
          .update({ status: 'failed', gateway_response: gw.raw })
          .eq('order_id', orderId);
        console.error('[zapupi] gateway rejected order', gw.raw);
        return { ok: false as const, order_id: orderId, error: 'Payment gateway is not responding. Try again.' };
      }

      await admin
        .from('zapupi_deposits')
        .update({ payment_url: gw.paymentUrl, gateway_response: gw.raw })
        .eq('order_id', orderId);

      return { ok: true as const, order_id: orderId, payment_url: gw.paymentUrl, amount_inr: amountInr };
    } catch (e) {
      await admin
        .from('zapupi_deposits')
        .update({ status: 'failed', gateway_response: { error: String((e as Error).message) } })
        .eq('order_id', orderId);
      console.error('[zapupi] create order error', e);
      return { ok: false as const, order_id: orderId, error: 'Payment could not be started right now.' };
    }
  });

/** Verify an order against ZapUPI and credit the wallet if paid (idempotent). */
export const syncZapupiDeposit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { getAdmin, settleZapupiOrder } = await import('./zapupi.server');
    const orderId = String(data?.order_id ?? '');
    if (!/^ZAP_[a-f0-9]{16,64}$/i.test(orderId)) {
      return { ok: false as const, error: 'Invalid order id' };
    }

    const admin = await getAdmin();
    const { data: dep } = await admin
      .from('zapupi_deposits')
      .select('user_id, status, credited, amount_inr, payment_url')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!dep || dep.user_id !== context.userId) {
      return { ok: false as const, error: 'Order not found' };
    }
    if (dep.credited) {
      return { ok: true as const, credited: true, already: true, status: 'completed', amount_inr: dep.amount_inr };
    }

    const result = await settleZapupiOrder({
      orderId,
      payload: { source: 'sync', order_id: orderId },
      source: 'sync',
    });

    return {
      ...result,
      amount_inr: dep.amount_inr,
      payment_url: dep.payment_url as string | null,
      status: result.status ?? dep.status,
    };
  });

/** Latest deposits for the signed-in user (wallet status UI). */
export const listMyZapupiDeposits = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAdmin } = await import('./zapupi.server');
    const admin = await getAdmin();
    const { data } = await admin
      .from('zapupi_deposits')
      .select('order_id, amount_inr, status, credited, payment_url, created_at, credited_at, utr, verify_attempts, last_verify_error, next_verify_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(5);
    return { deposits: (data ?? []) as Array<{
      order_id: string;
      amount_inr: number;
      status: string;
      credited: boolean;
      payment_url: string | null;
      created_at: string;
      credited_at: string | null;
      utr: string | null;
      verify_attempts: number | null;
      last_verify_error: string | null;
      next_verify_at: string | null;
    }> };
  });

/** Full verification timeline for one of the caller's own deposits. */
export const zapupiDepositTimeline = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order_id: string }) => input)
  .handler(async ({ data, context }) => {
    const orderId = String(data?.order_id ?? '');
    if (!/^ZAP_[a-f0-9]{16,64}$/i.test(orderId)) {
      return { ok: false as const, error: 'Invalid order id' };
    }
    const { getDepositTimeline } = await import('./zapupi.server');
    const result = await getDepositTimeline(orderId);
    if (!result.deposit || result.deposit.user_id !== context.userId) {
      return { ok: false as const, error: 'Order not found' };
    }
    const { user_id: _omit, ...deposit } = result.deposit;
    return { ok: true as const, deposit, events: result.events };
  });

/** Admin-only webhook health: URL, receipt stats, recent events and errors. */
export const zapupiWebhookHealth = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Forbidden');

    const { getAdmin } = await import('./zapupi.server');
    const admin = await getAdmin();
    const origin = resolveOrigin();
    const canonicalUrl = `${origin}/api/public/zapupi-webhook`;
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
    const since1h = new Date(Date.now() - 3600_000).toISOString();

    const [c24, c1, recent] = await Promise.all([
      admin
        .from('zapupi_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'webhook')
        .gte('received_at', since24h),
      admin
        .from('zapupi_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'webhook')
        .gte('received_at', since1h),
      admin
        .from('zapupi_webhook_events')
        .select('received_at, order_id, status, source, source_ip, processed, amount_match, credit_result')
        .order('received_at', { ascending: false })
        .limit(8),
    ]);

    const rows = (recent.data ?? []) as Array<{
      received_at: string;
      order_id: string;
      status: string | null;
      source: string | null;
      source_ip: string | null;
      processed: boolean | null;
      amount_match: boolean | null;
      credit_result: any;
    }>;

    const errors = rows
      .filter((r) => r?.credit_result?.error || r.amount_match === false)
      .map((r) => ({
        order_id: r.order_id,
        at: r.received_at,
        message: r.credit_result?.error ?? 'amount mismatch',
      }));

    const lastAt = rows.find((r) => r.source === 'webhook')?.received_at ?? null;

    return {
      ok: true,
      configured: Boolean(process.env['ZAPUPI_API_KEY']),
      canonical_webhook_url: canonicalUrl,
      healthy: (c24.count ?? 0) > 0,
      stats: {
        webhooks_last_1h: c1.count ?? 0,
        webhooks_last_24h: c24.count ?? 0,
        last_received_at: lastAt,
      },
      recent: rows,
      errors,
      server_time: new Date().toISOString(),
    };
  });
