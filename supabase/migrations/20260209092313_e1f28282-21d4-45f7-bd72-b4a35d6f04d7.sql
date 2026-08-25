-- Recreate all RLS policies as PERMISSIVE (drop and recreate)
-- This fixes the "no policies preventing unauthenticated access" warnings

-- profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- chat_conversations table
DROP POLICY IF EXISTS "Users can view own chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins can update all conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chat_conversations;

CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- subscription_requests table
DROP POLICY IF EXISTS "Users can view own subscription requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.subscription_requests;
DROP POLICY IF EXISTS "Users can create own requests" ON public.subscription_requests;

CREATE POLICY "Users can view own requests" ON public.subscription_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create requests" ON public.subscription_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage requests" ON public.subscription_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- providers table
DROP POLICY IF EXISTS "Admin only access providers" ON public.providers;
CREATE POLICY "Admin only providers" ON public.providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- provider_accounts table
DROP POLICY IF EXISTS "Admin only access provider accounts" ON public.provider_accounts;
CREATE POLICY "Admin only provider_accounts" ON public.provider_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- orders table
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- engagement_orders table
DROP POLICY IF EXISTS "Users can view own engagement orders" ON public.engagement_orders;
DROP POLICY IF EXISTS "Admins can manage all engagement orders" ON public.engagement_orders;
DROP POLICY IF EXISTS "Users can create own engagement orders" ON public.engagement_orders;

CREATE POLICY "Users view own engagement_orders" ON public.engagement_orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own engagement_orders" ON public.engagement_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage engagement_orders" ON public.engagement_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transactions table
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage transactions" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- wallets table
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own wallet" ON public.wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage wallets" ON public.wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- support_tickets table
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create own tickets" ON public.support_tickets;

CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions table
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;

CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles table
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));