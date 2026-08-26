REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_summary() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_due_engagement_run_ids(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_engagement_run_ids(integer) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'internal_cron_tokens'
  ) THEN
    EXECUTE 'CREATE POLICY "No app access to cron tokens" ON public.internal_cron_tokens FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;