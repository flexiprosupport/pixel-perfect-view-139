-- Add RESTRICTIVE policies to explicitly deny anonymous/unauthenticated access
-- Correct syntax: CREATE POLICY name ON table AS RESTRICTIVE FOR command TO role USING (...)

-- ========== PROFILES ==========
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== CHAT_CONVERSATIONS ==========
CREATE POLICY "Deny anonymous access to chat_conversations" 
ON public.chat_conversations 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== CHAT_MESSAGES ==========
CREATE POLICY "Deny anonymous access to chat_messages" 
ON public.chat_messages 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== SUBSCRIPTION_REQUESTS ==========
CREATE POLICY "Deny anonymous access to subscription_requests" 
ON public.subscription_requests 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== WALLETS ==========
CREATE POLICY "Deny anonymous access to wallets" 
ON public.wallets 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== TRANSACTIONS ==========
CREATE POLICY "Deny anonymous access to transactions" 
ON public.transactions 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== ORDERS ==========
CREATE POLICY "Deny anonymous access to orders" 
ON public.orders 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== ENGAGEMENT_ORDERS ==========
CREATE POLICY "Deny anonymous access to engagement_orders" 
ON public.engagement_orders 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== ENGAGEMENT_ORDER_ITEMS ==========
CREATE POLICY "Deny anonymous access to engagement_order_items" 
ON public.engagement_order_items 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== SUPPORT_TICKETS ==========
CREATE POLICY "Deny anonymous access to support_tickets" 
ON public.support_tickets 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== SUBSCRIPTIONS ==========
CREATE POLICY "Deny anonymous access to subscriptions" 
ON public.subscriptions 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== USER_ROLES ==========
CREATE POLICY "Deny anonymous access to user_roles" 
ON public.user_roles 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);

-- ========== ORGANIC_RUN_SCHEDULE ==========
CREATE POLICY "Deny anonymous access to organic_run_schedule" 
ON public.organic_run_schedule 
AS RESTRICTIVE 
FOR SELECT 
TO public
USING (auth.uid() IS NOT NULL);