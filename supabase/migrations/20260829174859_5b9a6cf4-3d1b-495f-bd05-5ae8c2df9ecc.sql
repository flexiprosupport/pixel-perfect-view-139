INSERT INTO public.internal_cron_tokens (name, token)
VALUES ('zapupi_cron', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

SELECT cron.schedule(
  'flexipro-zapupi-autoverify',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://flexipro.in/api/public/cron/zapupi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE name = 'zapupi_cron')
    ),
    body := '{}'::jsonb
  );
  $$
);