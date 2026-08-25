
REVOKE UPDATE ON public.engagement_order_items FROM authenticated;
GRANT UPDATE (status) ON public.engagement_order_items TO authenticated;
GRANT ALL ON public.engagement_order_items TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_cron_jobs') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_cron_run_details') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_cron_run_details(integer) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_cron_run_details(integer) TO service_role';
  END IF;
END$$;
