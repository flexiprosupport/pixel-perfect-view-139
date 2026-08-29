import { createFileRoute } from '@tanstack/react-router';

/**
 * Scheduler tick: dispatches due engagement runs to providers and syncs
 * provider delivery status. Protected by a shared token stored in
 * public.internal_cron_tokens (name = 'engagement_cron').
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get('token') ??
    request.headers.get('x-cron-token') ??
    '';
  if (!token) return new Response('Missing token', { status: 401 });

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row } = await supabaseAdmin
    .from('internal_cron_tokens')
    .select('token')
    .eq('name', 'engagement_cron')
    .maybeSingle();

  if (!row?.token || row.token !== token) {
    return new Response('Invalid token', { status: 401 });
  }

  const { executeDueRuns, syncRunStatus } = await import('@/lib/engagement.server');

  const result: Record<string, unknown> = {};
  try {
    result['execute'] = await executeDueRuns(50);
  } catch (err: any) {
    result['execute_error'] = String(err?.message ?? err);
  }
  try {
    result['status'] = await syncRunStatus({ limit: 50 });
  } catch (err: any) {
    result['status_error'] = String(err?.message ?? err);
  }

  return new Response(JSON.stringify({ ok: true, ...result }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/public/cron/engagement')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
