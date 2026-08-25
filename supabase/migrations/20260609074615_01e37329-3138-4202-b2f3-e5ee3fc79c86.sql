
REVOKE ALL ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) TO service_role;
