REVOKE ALL ON FUNCTION public.cancel_pending_runs_on_eo_cancel() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.cancel_pending_runs_on_item_cancel() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.chat_conversations_lock_user_columns() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.compute_rotation_lock_key() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.create_user_subscription() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.engagement_order_items_tracking_recompute() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.orders_tracking_recompute() FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.get_due_engagement_run_ids(p_limit integer) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_old_completed_engagement_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_due_engagement_run_ids(p_limit integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean) TO service_role;

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role text) FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_admin_users_summary() FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_ban_user_and_cancel(p_target_user_id uuid, p_reason text) FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_unban_user(p_target_user_id uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_ban_user_and_cancel(p_target_user_id uuid, p_reason text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(p_target_user_id uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated, service_role;