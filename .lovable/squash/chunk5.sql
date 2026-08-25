CREATE POLICY "Deny anonymous access to user_roles" ON public.user_roles AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to wallets" ON public.wallets AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "No self delete on user_roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "No self insert into user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "No self update on user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Only admins can update platform settings" ON public.platform_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users can create conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create messages in their conversations" ON public.chat_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid()))))));
CREATE POLICY "Users can create own order items" ON public.engagement_order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.engagement_orders
  WHERE ((engagement_orders.id = engagement_order_items.engagement_order_id) AND (engagement_orders.user_id = auth.uid())))));
CREATE POLICY "Users can create requests" ON public.subscription_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert runs for own engagement orders" ON public.organic_run_schedule FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.engagement_order_items eoi
     JOIN public.engagement_orders eo ON ((eo.id = eoi.engagement_order_id)))
  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid())))));
CREATE POLICY "Users can insert runs for own orders" ON public.organic_run_schedule FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid())))));
CREATE POLICY "Users can update conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users can update own engagement_order_items status" ON public.engagement_order_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.engagement_orders eo
  WHERE ((eo.id = engagement_order_items.engagement_order_id) AND (eo.user_id = auth.uid()))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.engagement_orders eo
  WHERE ((eo.id = engagement_order_items.engagement_order_id) AND (eo.user_id = auth.uid())))) AND (status = ANY (ARRAY['paused'::text, 'processing'::text, 'cancelled'::text]))));
CREATE POLICY "Users can update own engagement_orders status" ON public.engagement_orders FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (status = ANY (ARRAY['paused'::text, 'processing'::text, 'cancelled'::text]))));
CREATE POLICY "Users can update own order items" ON public.engagement_order_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.engagement_orders
  WHERE ((engagement_orders.id = engagement_order_items.engagement_order_id) AND (engagement_orders.user_id = auth.uid())))));
CREATE POLICY "Users can update own pending engagement runs" ON public.organic_run_schedule FOR UPDATE USING (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM (public.engagement_order_items eoi
     JOIN public.engagement_orders eo ON ((eo.id = eoi.engagement_order_id)))
  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid()))))));
CREATE POLICY "Users can update own pending order runs" ON public.organic_run_schedule FOR UPDATE USING (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid()))))));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Users may only update non-sensitive profile columns. Column-level privileges revoke UPDATE on user_id/email/api_key/is_banned/banned_at/banned_reason/created_at; trg_profiles_lock_user_columns provides an additional trigger-level guard.';
CREATE POLICY "Users can view own conversation messages" ON public.chat_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND ((chat_conversations.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));
CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users can view own engagement order items" ON public.engagement_order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.engagement_orders
  WHERE ((engagement_orders.id = engagement_order_items.engagement_order_id) AND ((engagement_orders.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));
CREATE POLICY "Users can view own organic runs" ON public.organic_run_schedule FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.engagement_order_items eoi
     JOIN public.engagement_orders eo ON ((eoi.engagement_order_id = eo.id)))
  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own requests" ON public.subscription_requests FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users create conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users create messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (((auth.uid() = sender_id) AND (((sender_role = 'user'::text) AND (EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid()))))) OR public.has_role(auth.uid(), 'admin'::public.app_role))));
CREATE POLICY "Users create own tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users create requests" ON public.subscription_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users see own oxapay deposits" ON public.oxapay_deposits FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users update conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users update own pending runs" ON public.organic_run_schedule FOR UPDATE TO authenticated USING (((status = 'pending'::text) AND ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.engagement_order_items eoi
     JOIN public.engagement_orders eo ON ((eo.id = eoi.engagement_order_id)))
  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid()))))))) WITH CHECK (((status = ANY (ARRAY['pending'::text, 'cancelled'::text])) AND ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.engagement_order_items eoi
     JOIN public.engagement_orders eo ON ((eo.id = eoi.engagement_order_id)))
  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid())))))));
CREATE POLICY "Users view own conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own deposits" ON public.deposits FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own engagement_orders" ON public.engagement_orders FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users view own messages" ON public.chat_messages FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own order items" ON public.engagement_order_items FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.engagement_orders
  WHERE ((engagement_orders.id = engagement_order_items.engagement_order_id) AND (engagement_orders.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users view own requests" ON public.subscription_requests FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own runs" ON public.organic_run_schedule FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.engagement_order_items eoi
     JOIN public.engagement_orders eo ON ((eo.id = eoi.engagement_order_id)))
  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::text)));
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users view own zapupi deposits" ON public.zapupi_deposits FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::text)));
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access" ON public.zapupi_webhook_events TO authenticated USING (false) WITH CHECK (false);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organic_run_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oxapay_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oxapay_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "popup_ads admin delete" ON public.popup_ads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "popup_ads admin insert" ON public.popup_ads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "popup_ads admin update" ON public.popup_ads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "popup_ads public read" ON public.popup_ads FOR SELECT USING (true);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_alert_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.razorpay_webhook_events TO service_role USING (true) WITH CHECK (true);
ALTER TABLE public.service_provider_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zapupi_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zapupi_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION public.admin_ban_user_and_cancel(p_target_user_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_ban_user_and_cancel(p_target_user_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_ban_user_and_cancel(p_target_user_id uuid, p_reason text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_unban_user(p_target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_unban_user(p_target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_unban_user(p_target_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean) TO service_role;
GRANT ALL ON FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_pending_runs_on_eo_cancel() FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_pending_runs_on_eo_cancel() TO service_role;
REVOKE ALL ON FUNCTION public.cancel_pending_runs_on_item_cancel() FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_pending_runs_on_item_cancel() TO service_role;
REVOKE ALL ON FUNCTION public.chat_conversations_lock_user_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.chat_conversations_lock_user_columns() TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM PUBLIC;
GRANT ALL ON FUNCTION public.cleanup_old_completed_engagement_orders() TO service_role;
REVOKE ALL ON FUNCTION public.compute_rotation_lock_key() FROM PUBLIC;
GRANT ALL ON FUNCTION public.compute_rotation_lock_key() TO service_role;
REVOKE ALL ON FUNCTION public.create_user_subscription() FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_user_subscription() TO service_role;
REVOKE ALL ON FUNCTION public.credit_wallet_oxapay(p_order_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.credit_wallet_oxapay(p_order_id text) TO service_role;
REVOKE ALL ON FUNCTION public.credit_wallet_zapupi(p_order_id text, p_txn_id text, p_utr text, p_gateway_response jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.credit_wallet_zapupi(p_order_id text, p_txn_id text, p_utr text, p_gateway_response jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.debit_wallet_for_order(p_user_id uuid, p_amount numeric, p_order_id uuid, p_engagement_order_id uuid, p_description text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.debit_wallet_for_order(p_user_id uuid, p_amount numeric, p_order_id uuid, p_engagement_order_id uuid, p_description text) TO service_role;
REVOKE ALL ON FUNCTION public.enforce_deposit_provenance() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_deposit_provenance() TO service_role;
REVOKE ALL ON FUNCTION public.enforce_wallet_credit_trail() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_wallet_credit_trail() TO service_role;
REVOKE ALL ON FUNCTION public.engagement_order_items_lock_user_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.engagement_order_items_lock_user_columns() TO service_role;
REVOKE ALL ON FUNCTION public.engagement_orders_lock_user_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.engagement_orders_lock_user_columns() TO service_role;
REVOKE ALL ON FUNCTION public.export_auth_users() FROM PUBLIC;
GRANT ALL ON FUNCTION public.export_auth_users() TO service_role;
REVOKE ALL ON FUNCTION public.export_auth_users_for_backup(p_limit integer, p_offset integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.export_auth_users_for_backup(p_limit integer, p_offset integer) TO service_role;
GRANT ALL ON FUNCTION public.get_due_engagement_run_ids(p_limit integer) TO service_role;
REVOKE ALL ON FUNCTION public.get_or_create_bot_user(_telegram_id text, _full_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_or_create_bot_user(_telegram_id text, _full_name text) TO service_role;
REVOKE ALL ON FUNCTION public.get_provider_topup_breakdown() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_provider_topup_breakdown() TO authenticated;
GRANT ALL ON FUNCTION public.get_provider_topup_breakdown() TO service_role;
REVOKE ALL ON FUNCTION public.get_provider_topup_plan() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_provider_topup_plan() TO authenticated;
GRANT ALL ON FUNCTION public.get_provider_topup_plan() TO service_role;
REVOKE ALL ON FUNCTION public.get_public_markup() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_markup() TO service_role;
REVOKE ALL ON FUNCTION public.get_top_pending_users(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_top_pending_users(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_top_pending_users(p_limit integer) TO service_role;
REVOKE ALL ON FUNCTION public.get_user_role(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_role(_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.guard_oxapay_deposit_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.guard_oxapay_deposit_change() TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role text) TO service_role;
REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_maintenance_mode() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_maintenance_mode() TO service_role;
GRANT ALL ON FUNCTION public.is_maintenance_mode() TO authenticated;
GRANT ALL ON FUNCTION public.is_maintenance_mode() TO anon;
REVOKE ALL ON FUNCTION public.is_user_banned(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_user_banned(_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.organic_run_schedule_lock_user_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.organic_run_schedule_lock_user_columns() TO service_role;
REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(key bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.pg_advisory_xact_lock(key bigint) TO service_role;
REVOKE ALL ON FUNCTION public.profiles_lock_user_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.profiles_lock_user_columns() TO service_role;
REVOKE ALL ON FUNCTION public.reschedule_organic_run(p_run_id uuid, p_quantity integer, p_scheduled_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reschedule_organic_run(p_run_id uuid, p_quantity integer, p_scheduled_at timestamp with time zone) TO service_role;
GRANT ALL ON FUNCTION public.reschedule_organic_run(p_run_id uuid, p_quantity integer, p_scheduled_at timestamp with time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.set_engagement_order_completed_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_conversation_last_message() TO service_role;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT SELECT ON TABLE public.admin_audit_log TO authenticated;
GRANT ALL ON TABLE public.admin_audit_log TO service_role;
GRANT SELECT ON TABLE public.deposits TO authenticated;
GRANT ALL ON TABLE public.deposits TO service_role;
GRANT SELECT ON TABLE public.engagement_order_items TO authenticated;
GRANT ALL ON TABLE public.engagement_order_items TO service_role;
GRANT UPDATE(status) ON TABLE public.engagement_order_items TO authenticated;
GRANT SELECT,UPDATE ON TABLE public.engagement_orders TO authenticated;
GRANT ALL ON TABLE public.engagement_orders TO service_role;
GRANT UPDATE(status) ON TABLE public.engagement_orders TO authenticated;
GRANT UPDATE(updated_at) ON TABLE public.engagement_orders TO authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT SELECT,UPDATE ON TABLE public.organic_run_schedule TO authenticated;
GRANT ALL ON TABLE public.organic_run_schedule TO service_role;
GRANT UPDATE(status) ON TABLE public.organic_run_schedule TO authenticated;
GRANT SELECT ON TABLE public.oxapay_deposits TO authenticated;
GRANT ALL ON TABLE public.oxapay_deposits TO service_role;
GRANT SELECT ON TABLE public.oxapay_webhook_events TO authenticated;
GRANT ALL ON TABLE public.oxapay_webhook_events TO service_role;
GRANT SELECT ON TABLE public.popup_ads TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.popup_ads TO authenticated;
GRANT ALL ON TABLE public.popup_ads TO service_role;
GRANT UPDATE(full_name) ON TABLE public.profiles TO authenticated;
GRANT UPDATE(updated_at) ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.providers_public TO authenticated;
GRANT SELECT ON TABLE public.providers_public TO anon;
GRANT ALL ON TABLE public.razorpay_webhook_events TO service_role;
GRANT ALL ON TABLE public.rotation_alert_state TO service_role;
GRANT SELECT ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT ON TABLE public.v_orders_missing_debit TO service_role;
GRANT SELECT ON TABLE public.wallets TO authenticated;
GRANT ALL ON TABLE public.wallets TO service_role;
GRANT SELECT ON TABLE public.zapupi_deposits TO authenticated;
GRANT ALL ON TABLE public.zapupi_deposits TO service_role;
GRANT ALL ON TABLE public.zapupi_webhook_events TO service_role;
