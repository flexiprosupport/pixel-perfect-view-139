-- Comprehensive fix: Ensure all SELECT policies have "TO authenticated" clause
-- This prevents anonymous/unauthenticated access to any table

-- ========== PROFILES ==========
-- (Already fixed in previous migration)

-- ========== CHAT_CONVERSATIONS ==========
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations" 
ON public.chat_conversations FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== CHAT_MESSAGES ==========
DROP POLICY IF EXISTS "Users can view own conversation messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;

CREATE POLICY "Users can view own conversation messages" 
ON public.chat_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM chat_conversations
  WHERE chat_conversations.id = chat_messages.conversation_id
  AND (chat_conversations.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Admins can view all messages" 
ON public.chat_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ========== SUBSCRIPTION_REQUESTS ==========
DROP POLICY IF EXISTS "Users can view own requests" ON public.subscription_requests;
CREATE POLICY "Users can view own requests" 
ON public.subscription_requests FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== WALLETS ==========
DROP POLICY IF EXISTS "Users view own wallet" ON public.wallets;
CREATE POLICY "Users view own wallet" 
ON public.wallets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ========== TRANSACTIONS ==========
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" 
ON public.transactions FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== ORDERS ==========
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" 
ON public.orders FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== ENGAGEMENT_ORDERS ==========
DROP POLICY IF EXISTS "Users view own engagement_orders" ON public.engagement_orders;
CREATE POLICY "Users view own engagement_orders" 
ON public.engagement_orders FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== ENGAGEMENT_ORDER_ITEMS ==========
DROP POLICY IF EXISTS "Users can view own engagement order items" ON public.engagement_order_items;
CREATE POLICY "Users can view own engagement order items" 
ON public.engagement_order_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM engagement_orders
  WHERE engagement_orders.id = engagement_order_items.engagement_order_id
  AND (engagement_orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

-- ========== SUPPORT_TICKETS ==========
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets" 
ON public.support_tickets FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== SUBSCRIPTIONS ==========
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" 
ON public.subscriptions FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== USER_ROLES ==========
DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
CREATE POLICY "Users view own role" 
ON public.user_roles FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- ========== ORGANIC_RUN_SCHEDULE ==========
DROP POLICY IF EXISTS "Users can view own organic runs" ON public.organic_run_schedule;
CREATE POLICY "Users can view own organic runs" 
ON public.organic_run_schedule FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM orders WHERE orders.id = organic_run_schedule.order_id AND orders.user_id = auth.uid()))
  OR (EXISTS (
    SELECT 1 FROM engagement_order_items eoi
    JOIN engagement_orders eo ON eoi.engagement_order_id = eo.id
    WHERE eoi.id = organic_run_schedule.engagement_order_item_id AND eo.user_id = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'admin')
);