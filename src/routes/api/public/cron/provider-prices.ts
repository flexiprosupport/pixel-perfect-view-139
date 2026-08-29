import { createFileRoute } from '@tanstack/react-router';

/**
 * Scheduled provider price refresh (every 30 minutes).
 * Protected by the shared token in public.internal_cron_tokens
 * (name = 'provider_price_sync').
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? request.headers.get('x-cron-token') ?? '';
  if (!token) return new Response('Missing token', { status: 401 });

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row } = await supabaseAdmin
    .from('internal_cron_tokens')
    .select('token')
    .eq('name', 'provider_price_sync')
    .maybeSingle();

  if (!row?.token || row.token !== token) {
    return new Response('Invalid token', { status: 401 });
  }

  const { syncPricesCore, logProviderAudit } = await import('@/lib/providers.server');

  const started = Date.now();
  try {
    const result = await syncPricesCore(supabaseAdmin);
    await logProviderAudit(supabaseAdmin, {
      action: 'provider_price_sync_scheduled',
      notes: 'Scheduled 30-minute price sync',
      metadata: { ...result, duration_ms: Date.now() - started },
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    const message = String(err?.message ?? err).slice(0, 300);
    await logProviderAudit(supabaseAdmin, {
      action: 'provider_price_sync_scheduled_failed',
      notes: message,
      metadata: { duration_ms: Date.now() - started },
    });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/public/cron/provider-prices')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
