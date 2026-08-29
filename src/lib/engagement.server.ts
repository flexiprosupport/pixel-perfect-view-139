/**
 * Server-only core logic for engagement orders:
 * order creation + wallet debit, provider dispatch of due runs, and status sync.
 */
import { callProviderApi } from '@/lib/providers.server';

export interface EngagementInput {
  type: string;
  quantity: number;
  service_id?: string | null;
  time_limit_hours?: number;
  variance_percent?: number;
  peak_hours_enabled?: boolean;
  scheduled_runs?: {
    run_number?: number;
    scheduled_at: string;
    quantity_to_send: number;
    base_quantity?: number;
    variance_applied?: number;
    peak_multiplier?: number;
  }[];
}

export interface PlaceOrderInput {
  bundle_id?: string | null;
  link: string;
  base_quantity: number;
  is_organic_mode?: boolean;
  engagements: EngagementInput[];
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Create an engagement order, its items and run schedule, then debit the wallet. */
export async function placeEngagementOrder(userId: string, input: PlaceOrderInput) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const link = input.link.trim();
  if (!/^https?:\/\//i.test(link)) throw new Error('Please enter a valid http(s) link');

  const enabled = (input.engagements ?? []).filter((e) => e && e.quantity > 0);
  if (!enabled.length) throw new Error('Select at least one engagement type');

  // Banned users cannot order.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_banned')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile?.is_banned) throw new Error('Your account is suspended. Contact support.');

  // Admin-controlled per-bundle pricing.
  const bundleItems = input.bundle_id
    ? (
        await supabaseAdmin
          .from('bundle_items')
          .select('engagement_type, service_id, price_per_k')
          .eq('bundle_id', input.bundle_id)
      ).data ?? []
    : [];
  const bundleByType = new Map(bundleItems.map((b: any) => [b.engagement_type, b]));

  // Resolve services and recompute the price server-side (never trust the client).
  const serviceIds = Array.from(
    new Set(
      enabled
        .map((e) => e.service_id || (bundleByType.get(e.type) as any)?.service_id)
        .filter(Boolean) as string[],
    ),
  );
  const { data: services } = serviceIds.length
    ? await supabaseAdmin
        .from('services')
        .select('id, price, min_quantity, max_quantity, is_active, name')
        .in('id', serviceIds)
    : { data: [] as any[] };
  const serviceById = new Map((services ?? []).map((s: any) => [s.id, s]));

  type Priced = { input: EngagementInput; serviceId: string | null; price: number };
  const priced: Priced[] = [];

  for (const e of enabled) {
    const bundleItem: any = bundleByType.get(e.type);
    const serviceId = (e.service_id || bundleItem?.service_id || null) as string | null;
    const service: any = serviceId ? serviceById.get(serviceId) : null;

    if (service && service.is_active === false) {
      throw new Error(`${e.type}: service is currently unavailable`);
    }
    if (service && e.quantity < Number(service.min_quantity ?? 0)) {
      throw new Error(`${e.type}: minimum quantity is ${service.min_quantity}`);
    }
    if (service && service.max_quantity && e.quantity > Number(service.max_quantity)) {
      throw new Error(`${e.type}: maximum quantity is ${service.max_quantity}`);
    }

    const pricePerK =
      bundleItem?.price_per_k && Number(bundleItem.price_per_k) > 0
        ? Number(bundleItem.price_per_k)
        : Number(service?.price ?? 0);
    if (!(pricePerK > 0)) {
      throw new Error(`${e.type}: pricing is not configured. Please contact support.`);
    }

    priced.push({ input: e, serviceId, price: round4((e.quantity / 1000) * pricePerK) });
  }

  const totalPrice = round4(priced.reduce((s, p) => s + p.price, 0));
  if (!(totalPrice > 0)) throw new Error('Invalid order total');

  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (!wallet) throw new Error('Wallet not found. Please refresh the page.');
  if (Number(wallet.balance ?? 0) < totalPrice) {
    throw new Error('Insufficient balance. Please add funds.');
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('engagement_orders')
    .insert({
      user_id: userId,
      bundle_id: input.bundle_id ?? null,
      link,
      base_quantity: Math.max(1, Math.floor(input.base_quantity || 0)),
      total_price: totalPrice,
      is_organic_mode: input.is_organic_mode ?? true,
      status: 'pending',
    })
    .select('id, order_number')
    .single();
  if (orderErr || !order) throw new Error(orderErr?.message ?? 'Could not create order');

  const rollback = async (message: string) => {
    await supabaseAdmin.from('engagement_orders').delete().eq('id', order.id);
    throw new Error(message);
  };

  // Items + run schedule
  for (const p of priced) {
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('engagement_order_items')
      .insert({
        engagement_order_id: order.id,
        engagement_type: p.input.type,
        service_id: p.serviceId,
        quantity: Math.floor(p.input.quantity),
        price: p.price,
        is_enabled: true,
        status: 'pending',
      })
      .select('id')
      .single();
    if (itemErr || !item) await rollback(itemErr?.message ?? 'Could not create order item');

    const runs = (p.input.scheduled_runs ?? []).filter((r) => r && r.quantity_to_send > 0);
    const rows =
      runs.length > 0
        ? runs.map((r, i) => ({
            engagement_order_item_id: item!.id,
            run_number: r.run_number ?? i + 1,
            scheduled_at: new Date(r.scheduled_at).toISOString(),
            quantity_to_send: Math.max(1, Math.floor(r.quantity_to_send)),
            base_quantity: Math.max(1, Math.floor(r.base_quantity ?? r.quantity_to_send)),
            variance_applied: Math.round(r.variance_applied ?? 0),
            peak_multiplier: r.peak_multiplier ?? 1,
            status: 'pending',
          }))
        : [
            {
              engagement_order_item_id: item!.id,
              run_number: 1,
              scheduled_at: new Date().toISOString(),
              quantity_to_send: Math.floor(p.input.quantity),
              base_quantity: Math.floor(p.input.quantity),
              variance_applied: 0,
              peak_multiplier: 1,
              status: 'pending',
            },
          ];

    const { error: runErr } = await supabaseAdmin.from('organic_run_schedule').insert(rows);
    if (runErr) await rollback(`Could not schedule runs: ${runErr.message}`);
  }

  // Charge the wallet (atomic debit + ledger row).
  const { error: debitErr } = await supabaseAdmin.rpc('debit_wallet_for_order' as never, {
    p_user_id: userId,
    p_amount: totalPrice,
    p_order_id: null,
    p_engagement_order_id: order.id,
    p_description: `Engagement order #${order.order_number}`,
  } as never);
  if (debitErr) await rollback(debitErr.message);

  await supabaseAdmin
    .from('engagement_orders')
    .update({ status: 'processing' })
    .eq('id', order.id);

  return {
    success: true,
    order_id: order.id,
    order_number: order.order_number,
    total_price: totalPrice,
  };
}

// ---------------------------------------------------------------------------
// Provider dispatch
// ---------------------------------------------------------------------------

async function resolveProviderAccount(admin: any, serviceId: string | null) {
  if (!serviceId) return null;

  const { data: mappings } = await admin
    .from('service_provider_mapping')
    .select('provider_service_id, provider_account_id, sort_order, is_active')
    .eq('service_id', serviceId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  for (const m of mappings ?? []) {
    const { data: acct } = await admin
      .from('provider_accounts')
      .select('id, name, api_url, api_key, is_active, cooldown_until')
      .eq('id', m.provider_account_id)
      .maybeSingle();
    if (!acct?.is_active) continue;
    if (acct.cooldown_until && new Date(acct.cooldown_until) > new Date()) continue;
    return { account: acct, providerServiceId: String(m.provider_service_id) };
  }

  // Fallback: the service's own provider + highest-priority active account.
  const { data: svc } = await admin
    .from('services')
    .select('provider_id, provider_service_id')
    .eq('id', serviceId)
    .maybeSingle();
  if (!svc?.provider_id) return null;
  const { data: acct } = await admin
    .from('provider_accounts')
    .select('id, name, api_url, api_key, is_active')
    .eq('provider_id', svc.provider_id)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!acct) return null;
  return { account: acct, providerServiceId: String(svc.provider_service_id) };
}

/** Exponential backoff (minutes) between provider dispatch attempts. */
const MAX_RETRIES = 5;
const backoffMinutes = (attempt: number) => Math.min(60, 2 ** Math.max(0, attempt));

/** Send every due (pending, or failed-and-ready-for-retry) run to its provider. */
export async function executeDueRuns(limit = 25) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const { data: due, error } = await supabaseAdmin.rpc('get_due_engagement_run_ids_v2' as never, {
    p_limit: limit,
  } as never);
  if (error) throw new Error(error.message);

  const ids = ((due ?? []) as { id: string }[]).map((r) => r.id);
  let sent = 0;
  let retried = 0;
  const failures: string[] = [];

  for (const runId of ids) {
    // Claim the run so parallel workers cannot double-send it.
    // provider_order_id IS NULL is the idempotency guard: a run that already
    // reached the provider can never be dispatched again.
    const { data: claimed } = await supabaseAdmin
      .from('organic_run_schedule')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', runId)
      .in('status', ['pending', 'failed'])
      .is('provider_order_id', null)
      .select('id, quantity_to_send, engagement_order_item_id, retry_count')
      .maybeSingle();
    if (!claimed) continue;
    if (Number(claimed.retry_count ?? 0) > 0) retried++;

    const fail = async (message: string) => {
      failures.push(message);
      const attempt = Number(claimed.retry_count ?? 0) + 1;
      const exhausted = attempt >= MAX_RETRIES;
      await supabaseAdmin
        .from('organic_run_schedule')
        .update({
          status: 'failed',
          error_message: `${message.slice(0, 380)}${exhausted ? ' (retries exhausted)' : ''}`,
          retry_count: attempt,
          next_attempt_at: exhausted
            ? null
            : new Date(Date.now() + backoffMinutes(attempt) * 60_000).toISOString(),
        })
        .eq('id', runId);
    };


    try {
      const { data: item } = await supabaseAdmin
        .from('engagement_order_items')
        .select('id, service_id, status, engagement_order_id')
        .eq('id', claimed.engagement_order_item_id!)
        .maybeSingle();
      if (!item) throw new Error('Order item not found');

      const { data: order } = await supabaseAdmin
        .from('engagement_orders')
        .select('id, link, status')
        .eq('id', item.engagement_order_id)
        .maybeSingle();
      if (!order) throw new Error('Order not found');
      if (order.status === 'cancelled' || item.status === 'cancelled') {
        await supabaseAdmin
          .from('organic_run_schedule')
          .update({ status: 'cancelled' })
          .eq('id', runId);
        continue;
      }

      const resolved = await resolveProviderAccount(supabaseAdmin, item.service_id);
      if (!resolved) throw new Error('No active provider account mapped for this service');

      const res = await callProviderApi(resolved.account.api_url, resolved.account.api_key, {
        action: 'add',
        service: resolved.providerServiceId,
        link: order.link,
        quantity: claimed.quantity_to_send,
      });
      const providerOrderId = String(res?.order ?? res?.id ?? '');
      if (!providerOrderId) throw new Error('Provider did not return an order id');

      await supabaseAdmin
        .from('organic_run_schedule')
        .update({
          status: 'started',
          provider_order_id: providerOrderId,
          provider_response: res as never,
          provider_account_id: resolved.account.id,
          provider_account_name: resolved.account.name,
          error_message: null,
          next_attempt_at: null,
        })
        .eq('id', runId);

      await supabaseAdmin
        .from('engagement_order_items')
        .update({ status: 'processing', provider_order_id: providerOrderId })
        .eq('id', item.id);

      sent++;
    } catch (err: any) {
      await fail(String(err?.message ?? 'Unknown provider error'));
    }
  }

  return { due: ids.length, sent, retried, failed: failures.length, errors: failures.slice(0, 10) };

}

// ---------------------------------------------------------------------------
// Status sync
// ---------------------------------------------------------------------------

/** Poll the provider for one run (or all in-flight runs) and persist the result. */
export async function syncRunStatus(opts: { runId?: string; limit?: number } = {}) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  let query = supabaseAdmin
    .from('organic_run_schedule')
    .select('id, provider_order_id, provider_account_id, engagement_order_item_id, status')
    .not('provider_order_id', 'is', null);

  query = opts.runId
    ? query.eq('id', opts.runId)
    : query.in('status', ['started', 'processing']).limit(opts.limit ?? 50);

  const { data: runs, error } = await query;
  if (error) throw new Error(error.message);

  let completed = 0;
  let stillProcessing = 0;
  const touchedItems = new Set<string>();

  for (const run of runs ?? []) {
    try {
      const { data: acct } = await supabaseAdmin
        .from('provider_accounts')
        .select('api_url, api_key')
        .eq('id', run.provider_account_id!)
        .maybeSingle();
      if (!acct) continue;

      const res = await callProviderApi(acct.api_url, acct.api_key, {
        action: 'status',
        order: run.provider_order_id!,
      });

      const providerStatus = String(res?.status ?? '').toLowerCase();
      const remains = Number(res?.remains ?? 0);
      const startCount = Number(res?.start_count ?? 0);
      const charge = Number(res?.charge ?? 0);
      const isDone = ['completed', 'partial', 'canceled', 'cancelled'].includes(providerStatus);

      await supabaseAdmin
        .from('organic_run_schedule')
        .update({
          provider_status: providerStatus || null,
          provider_remains: Number.isFinite(remains) ? remains : null,
          provider_start_count: Number.isFinite(startCount) ? startCount : null,
          provider_charge: Number.isFinite(charge) ? charge : null,
          last_status_check: new Date().toISOString(),
          ...(isDone
            ? { status: 'completed', completed_at: new Date().toISOString() }
            : { status: 'started' }),
        })
        .eq('id', run.id);

      if (isDone) completed++;
      else stillProcessing++;
      if (run.engagement_order_item_id) touchedItems.add(run.engagement_order_item_id);
    } catch {
      stillProcessing++;
    }
  }

  // Roll item/order status up once every touched run has finished.
  for (const itemId of touchedItems) {
    const { data: itemRuns } = await supabaseAdmin
      .from('organic_run_schedule')
      .select('status')
      .eq('engagement_order_item_id', itemId);
    const allDone = (itemRuns ?? []).every((r: any) =>
      ['completed', 'cancelled', 'failed'].includes(r.status),
    );
    if (!allDone) continue;

    await supabaseAdmin
      .from('engagement_order_items')
      .update({ status: 'completed' })
      .eq('id', itemId)
      .neq('status', 'cancelled');

    const { data: item } = await supabaseAdmin
      .from('engagement_order_items')
      .select('engagement_order_id')
      .eq('id', itemId)
      .maybeSingle();
    if (!item) continue;

    const { data: siblings } = await supabaseAdmin
      .from('engagement_order_items')
      .select('status')
      .eq('engagement_order_id', item.engagement_order_id);
    if ((siblings ?? []).every((s: any) => ['completed', 'cancelled'].includes(s.status))) {
      await supabaseAdmin
        .from('engagement_orders')
        .update({ status: 'completed' })
        .eq('id', item.engagement_order_id)
        .neq('status', 'cancelled');
    }
  }

  return { checked: runs?.length ?? 0, completed, stillProcessing };
}

// ---------------------------------------------------------------------------
// Scheduler monitoring
// ---------------------------------------------------------------------------

/** Snapshot of the run scheduler for the admin monitor page. */
export async function schedulerStatus() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabaseAdmin
    .from('organic_run_schedule')
    .select('id, run_number, status, scheduled_at, started_at, completed_at, error_message, provider_account_name')
    .gte('scheduled_at', since)
    .order('scheduled_at', { ascending: false })
    .limit(50);

  const rows = recent ?? [];
  const successCount = rows.filter((r: any) => r.status === 'completed').length;
  const failedCount = rows.filter((r: any) => r.status === 'failed').length;
  const totalRuns = rows.length;

  const { count: pendingDue } = await supabaseAdmin
    .from('organic_run_schedule')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString());

  const { count: inFlight } = await supabaseAdmin
    .from('organic_run_schedule')
    .select('id', { count: 'exact', head: true })
    .in('status', ['started', 'processing']);

  return {
    jobs: [
      {
        id: 1,
        name: 'execute-all-runs',
        schedule: 'every minute',
        frequency: 'Dispatch due runs to providers',
        active: true,
      },
      {
        id: 2,
        name: 'check-order-status',
        schedule: 'every 5 minutes',
        frequency: 'Sync provider delivery status',
        active: true,
      },
    ],
    recentRuns: rows.map((r: any, i: number) => ({
      id: i + 1,
      jobId: 1,
      jobName: r.provider_account_name ?? 'run',
      status: r.status,
      message: r.error_message ?? `Run #${r.run_number}`,
      startTime: r.started_at ?? r.scheduled_at,
      endTime: r.completed_at ?? '',
      duration:
        r.started_at && r.completed_at
          ? Math.round(
              (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000,
            )
          : null,
    })),
    stats: {
      totalRuns,
      successCount,
      failedCount,
      successRate: totalRuns ? Math.round((successCount / totalRuns) * 100) : 0,
    },
    pendingDue: pendingDue ?? 0,
    inFlight: inFlight ?? 0,
  };
}
