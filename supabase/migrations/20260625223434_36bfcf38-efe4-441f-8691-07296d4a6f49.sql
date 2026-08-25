-- Kill the Razorpay credit path entirely
DROP FUNCTION IF EXISTS public.credit_wallet_razorpay(uuid, text, numeric, numeric);

-- Lock down ZapUPI credit RPC so only service_role (edge functions) can execute it.
REVOKE ALL ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) TO service_role;