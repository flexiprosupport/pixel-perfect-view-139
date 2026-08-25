
-- Fix 1: Remove provider_accounts from realtime publication (contains api_key secrets)
ALTER PUBLICATION supabase_realtime DROP TABLE public.provider_accounts;

-- Fix 2: Remove dead user-insert policy on transactions.
-- The policy required balance_after IS NULL, but the column is NOT NULL,
-- so the policy could never succeed anyway. All deposit/wallet writes go
-- through service-role edge functions. Drop it to eliminate any ambiguity
-- about users supplying balance_after.
DROP POLICY IF EXISTS "Users create own deposit transactions" ON public.transactions;
