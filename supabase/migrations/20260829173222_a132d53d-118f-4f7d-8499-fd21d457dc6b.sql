SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('flexipro-engagement-tick');

SELECT cron.schedule(
  'flexipro-engagement-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://flexipro.in/api/public/cron/engagement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE name = 'engagement_cron')
    ),
    body := '{}'::jsonb
  );
  $$
);