-- Close the fund bypass: users must go through edge functions (which debit the wallet).
-- Service role (edge functions) bypasses RLS, so dropping these policies does NOT break the app.
-- Admins still have their "Admins manage ..." ALL policy.

DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users create own engagement_orders" ON public.engagement_orders;
DROP POLICY IF EXISTS "Users create own order items" ON public.engagement_order_items;
DROP POLICY IF EXISTS "Users insert runs for own engagement orders" ON public.organic_run_schedule;