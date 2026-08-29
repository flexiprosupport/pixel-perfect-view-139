ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS last_price_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_price_sync_status text,
  ADD COLUMN IF NOT EXISTS last_price_sync_error text;

INSERT INTO public.internal_cron_tokens (name, token)
VALUES ('provider_price_sync', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (name) DO NOTHING;

SELECT cron.unschedule('flexipro-provider-price-sync')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flexipro-provider-price-sync');

SELECT cron.schedule(
  'flexipro-provider-price-sync',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://flexipro.in/api/public/cron/provider-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE name = 'provider_price_sync')
    ),
    body := '{}'::jsonb
  );
  $$
);