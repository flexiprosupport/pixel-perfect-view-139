
-- 1) Attach missing lock triggers (functions already exist)
DROP TRIGGER IF EXISTS trg_engagement_orders_lock_user_columns ON public.engagement_orders;
CREATE TRIGGER trg_engagement_orders_lock_user_columns
BEFORE UPDATE ON public.engagement_orders
FOR EACH ROW EXECUTE FUNCTION public.engagement_orders_lock_user_columns();

DROP TRIGGER IF EXISTS trg_engagement_order_items_lock_user_columns ON public.engagement_order_items;
CREATE TRIGGER trg_engagement_order_items_lock_user_columns
BEFORE UPDATE ON public.engagement_order_items
FOR EACH ROW EXECUTE FUNCTION public.engagement_order_items_lock_user_columns();

-- 2) Lock down SECURITY DEFINER function execution
-- Revoke default PUBLIC execute from every function we own in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE only for functions actually called by the app (authenticated users).
-- Edge functions use service_role which retains access via GRANT ALL below.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user_and_cancel(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_topup_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_topup_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_pending_users(integer) TO authenticated;

-- service_role keeps full access for edge functions (credit_wallet_*, debit_wallet_for_order, etc.)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
                   r.proname, r.args);
  END LOOP;
END $$;
