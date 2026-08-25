
-- =========================================================
-- Tighten EXECUTE on SECURITY DEFINER functions.
-- service_role always retains full access for backend code.
-- =========================================================

-- 🚨 CRITICAL: wallet credit must NEVER be callable from clients.
REVOKE ALL ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) TO service_role;

-- Admin-only RPCs: function body already checks has_role('admin'),
-- but block anon entirely so unauthenticated requests die at the door.
REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_users_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_users_summary() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated, service_role;

-- Cleanup is invoked by cron / backend only.
REVOKE ALL ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_completed_engagement_orders() TO service_role;

-- Advisory lock helper: only backend code should grab cross-tx locks.
REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.pg_advisory_xact_lock(bigint) TO service_role;

-- Trigger-only helpers: triggers fire as table owner, so no role
-- ever needs to call these directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.create_user_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_user_subscription() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.set_engagement_order_completed_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_engagement_order_completed_at() FROM anon, authenticated;

-- Helpers used in RLS policies and public UI — must stay callable
-- so RLS / catalog / maintenance banner keep working.
-- (has_role + get_user_role are evaluated inside RLS policies, and
--  get_public_markup + is_maintenance_mode are read by anon visitors.)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid)      TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_markup()      TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_maintenance_mode()    TO anon, authenticated, service_role;
