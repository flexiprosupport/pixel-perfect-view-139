-- Fix RLS policies for all tables to prevent public access

-- 1. profiles table - only own profile access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

-- 2. subscription_requests - only own requests
DROP POLICY IF EXISTS "Users can view own requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Users can view their requests" ON public.subscription_requests;
CREATE POLICY "Users can view own subscription requests" ON public.subscription_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. chat_conversations - only own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own chat conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. provider_accounts - admin only
DROP POLICY IF EXISTS "Admin can manage provider accounts" ON public.provider_accounts;
DROP POLICY IF EXISTS "Admins can manage provider accounts" ON public.provider_accounts;
CREATE POLICY "Admin only access provider accounts" ON public.provider_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. providers - admin only  
DROP POLICY IF EXISTS "Admin can manage providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can manage providers" ON public.providers;
CREATE POLICY "Admin only access providers" ON public.providers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. orders - only own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 7. engagement_orders - only own orders
DROP POLICY IF EXISTS "Users can view own engagement orders" ON public.engagement_orders;
DROP POLICY IF EXISTS "Users can view their engagement orders" ON public.engagement_orders;
CREATE POLICY "Users can view own engagement orders" ON public.engagement_orders FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 8. transactions - only own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 9. wallets - only own wallet
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- 10. support_tickets - only own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 11. subscriptions - only own subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 12. user_roles - admin only for viewing all, users can see own
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 13. chat_messages - only participants can view
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.chat_messages;
CREATE POLICY "Users can view own conversation messages" ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 14. engagement_order_items - only own items
DROP POLICY IF EXISTS "Users can view own items" ON public.engagement_order_items;
CREATE POLICY "Users can view own engagement order items" ON public.engagement_order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.engagement_orders 
    WHERE id = engagement_order_id 
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 15. organic_run_schedule - only own runs
DROP POLICY IF EXISTS "Users can view own runs" ON public.organic_run_schedule;
CREATE POLICY "Users can view own organic runs" ON public.organic_run_schedule FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.engagement_order_items eoi
    JOIN public.engagement_orders eo ON eoi.engagement_order_id = eo.id
    WHERE eoi.id = engagement_order_item_id AND eo.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);