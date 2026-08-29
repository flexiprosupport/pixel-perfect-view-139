import { createFileRoute } from '@tanstack/react-router';

/**
 * Scheduler tick: automatically verifies recent uncredited UPI deposits with
 * the gateway and credits wallets when the payment is confirmed.
 * Protected by a shared token in public.internal_cron_tokens (name = 'zapupi_cron').
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? request.headers.get('x-cron-token') ?? '';
  if (!token) return new Response('Missing token', { status: 401 });

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row } = await supabaseAdmin
    .from('internal_cron_tokens')
    .select('token')
    .eq('name', 'zapupi_cron')
    .maybeSingle();

  if (!row?.token || row.token !== token) {
    return new Response('Invalid token', { status: 401 });
  }

  const { settlePendingZapupiDeposits } = await import('@/lib/zapupi.server');

  try {
    const result = await settlePendingZapupiDeposits(25);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/public/cron/zapupi')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
