
-- Fix SECURITY DEFINER view: enforce invoker's RLS
ALTER VIEW public.v_orders_missing_debit SET (security_invoker = on);

-- Revoke EXECUTE from PUBLIC/anon/authenticated on all SECURITY DEFINER functions, then re-grant selectively.

-- Trigger functions and internal helpers: no direct callers
REVOKE EXECUTE ON FUNCTION public.cancel_pending_runs_on_eo_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_pending_runs_on_item_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_rotation_lock_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_deposit_provenance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_wallet_credit_trail() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_order_items_lock_user_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_orders_lock_user_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_oxapay_deposit_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.organic_run_schedule_lock_user_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM PUBLIC, anon, authenticated;

-- Backend-only wallet/credit/cleanup helpers (called by edge functions with service_role or by cron)
REVOKE EXECUTE ON FUNCTION public.credit_wallet_oxapay(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

-- Admin-only functions: revoke from anon (they check admin internally but shouldn't be probable by anon)
REVOKE EXECUTE ON FUNCTION public.admin_ban_user_and_cancel(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_provider_topup_breakdown() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_provider_topup_plan() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_pending_users(integer) FROM PUBLIC, anon;

-- User-scoped helpers: revoke from anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;

-- Public read helpers: keep anon executable (safe, return public settings)
-- get_public_markup, is_maintenance_mode remain callable by anon/authenticated.
