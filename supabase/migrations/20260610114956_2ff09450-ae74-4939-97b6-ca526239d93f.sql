
-- 1) Platform settings: remove public markup exposure
DROP POLICY IF EXISTS "Authenticated users read platform settings" ON public.platform_settings;

CREATE OR REPLACE FUNCTION public.get_public_markup()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT global_markup_percent FROM public.platform_settings LIMIT 1), 0)::numeric
$$;

REVOKE ALL ON FUNCTION public.get_public_markup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_markup() TO anon, authenticated;

-- 2) Engagement orders: restrict user UPDATE to status only (column-level grant)
REVOKE UPDATE ON public.engagement_orders FROM authenticated;
GRANT UPDATE (status, updated_at) ON public.engagement_orders TO authenticated;

DROP POLICY IF EXISTS "Users can update own engagement_orders" ON public.engagement_orders;
CREATE POLICY "Users can update own engagement_orders status"
ON public.engagement_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('paused','processing','cancelled')
);

-- 3) Engagement order items: same column-level restriction
REVOKE UPDATE ON public.engagement_order_items FROM authenticated;
GRANT UPDATE (status, updated_at) ON public.engagement_order_items TO authenticated;

DROP POLICY IF EXISTS "Users can update own engagement_order_items" ON public.engagement_order_items;
CREATE POLICY "Users can update own engagement_order_items status"
ON public.engagement_order_items
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.engagement_orders eo
  WHERE eo.id = engagement_order_items.engagement_order_id
    AND eo.user_id = auth.uid()
))
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.engagement_orders eo
    WHERE eo.id = engagement_order_items.engagement_order_id
      AND eo.user_id = auth.uid()
  )
  AND status IN ('paused','processing','cancelled')
);

-- 4) Transactions: tighten user INSERT
DROP POLICY IF EXISTS "Users create own deposit transactions" ON public.transactions;
CREATE POLICY "Users create own deposit transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type = 'deposit'
  AND status = 'pending'
  AND amount IS NOT NULL
  AND amount > 0
  AND amount <= 1000
  AND (balance_after IS NULL OR balance_after >= 0)
  AND payment_method IN ('upi','manual','bank_transfer')
);

-- 5) Wallets: regular users should never UPDATE wallet directly — only service role / admin
REVOKE UPDATE, DELETE ON public.wallets FROM authenticated;
-- (SELECT/INSERT remain for "Users view own wallet" / "Users insert own wallet" policies)

-- 6) Lock down internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_engagement_order_completed_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_maintenance_mode() FROM PUBLIC;

-- Keep has_role / get_user_role / is_maintenance_mode callable by authenticated (used by hooks/policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO anon, authenticated;

-- Admin RPCs remain callable by authenticated (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated;
