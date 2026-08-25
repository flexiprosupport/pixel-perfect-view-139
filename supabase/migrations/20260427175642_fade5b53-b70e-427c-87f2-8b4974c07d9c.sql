-- Revoke default PUBLIC execute from all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Grant only what's needed
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

-- Cleanup function: only service_role (used by cron)
GRANT EXECUTE ON FUNCTION public.cleanup_old_completed_engagement_orders() TO service_role;