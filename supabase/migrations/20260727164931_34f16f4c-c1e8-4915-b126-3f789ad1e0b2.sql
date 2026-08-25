CREATE INDEX IF NOT EXISTS idx_org_runs_provider_started
  ON public.organic_run_schedule (provider_account_id, started_at DESC)
  WHERE provider_order_id IS NOT NULL;

DROP INDEX IF EXISTS public.idx_organic_runs_item_id;
DROP INDEX IF EXISTS public.idx_organic_run_schedule_status_scheduled;
DROP INDEX IF EXISTS public.idx_organic_run_schedule_status_started;