
-- SECURITY FIX: Remove dangerous policies that allow users to modify their own wallet
DROP POLICY IF EXISTS "Users update own wallet" ON public.wallets;

-- SECURITY FIX: Remove policy that lets users insert transactions directly
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;

-- SECURITY FIX: Remove policy that lets users insert into wallets
DROP POLICY IF EXISTS "Users insert own wallet" ON public.wallets;
