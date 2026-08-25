CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internal_cron_tokens TO service_role;

ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can read internal cron tokens" ON public.internal_cron_tokens;
CREATE POLICY "Service role can read internal cron tokens"
ON public.internal_cron_tokens
FOR SELECT
TO service_role
USING (true);

INSERT INTO public.internal_cron_tokens (name)
VALUES ('organic-runs-minutely'), ('check-order-status-every-2-min')
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  PERFORM cron.unschedule('organic-runs-minutely');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('check-order-status-every-2-min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'organic-runs-minutely',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nydafzsnbvsessixqvjl.supabase.co/functions/v1/execute-all-runs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lovable-cron', 'organic-runs-minutely',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE name = 'organic-runs-minutely')
    ),
    body := jsonb_build_object('source', 'cron')
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'check-order-status-every-2-min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nydafzsnbvsessixqvjl.supabase.co/functions/v1/check-order-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lovable-cron', 'check-order-status-every-2-min',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE name = 'check-order-status-every-2-min')
    ),
    body := jsonb_build_object('source', 'cron')
  ) AS request_id;
  $$
);