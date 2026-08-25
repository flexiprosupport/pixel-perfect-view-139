-- ============================================================
-- COMPREHENSIVE FIX: All missing DB changes in one migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add organic settings columns to profiles (if not already there)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_organic_mode_default BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organic_ratios JSONB DEFAULT '{"views": 100, "likes": 5, "comments": 2, "saves": 1, "shares": 1, "reposts": 0.5, "followers": 2, "subscribers": 3, "watch_hours": 5, "retweets": 4}'::jsonb;

-- 2. Ensure the has_role function exists (cast text to app_role enum)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::app_role
  );
$$;

-- 3. Admin RLS policies for TRANSACTIONS table
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
CREATE POLICY "Admins can manage all transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Admin RLS policies for PROFILES table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admin RLS policies for ORDERS table
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admin RLS policies for ENGAGEMENT_ORDERS table
DROP POLICY IF EXISTS "Admins can manage all engagement_orders" ON public.engagement_orders;
CREATE POLICY "Admins can manage all engagement_orders"
ON public.engagement_orders FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admin RLS for SUBSCRIPTION_REQUESTS
DROP POLICY IF EXISTS "Admins can manage subscription requests" ON public.subscription_requests;
CREATE POLICY "Admins can manage subscription requests"
ON public.subscription_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Admin RLS for SUBSCRIPTIONS
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. Admin RLS for WALLETS
DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.wallets;
CREATE POLICY "Admins can manage all wallets"
ON public.wallets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Users can read/update their OWN profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 11. Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 12. Users can insert their own transactions (for deposit requests)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
