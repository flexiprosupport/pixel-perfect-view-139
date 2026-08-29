-- 1) engagement_order_items: drop permissive unchecked UPDATE policy
DROP POLICY IF EXISTS "Users can update own order items" ON public.engagement_order_items;

-- 2) organic_run_schedule: drop legacy UPDATE policies with no WITH CHECK
DROP POLICY IF EXISTS "Users can update own pending engagement runs" ON public.organic_run_schedule;
DROP POLICY IF EXISTS "Users can update own pending order runs" ON public.organic_run_schedule;

-- 3) transactions: users may not forge transaction rows
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;