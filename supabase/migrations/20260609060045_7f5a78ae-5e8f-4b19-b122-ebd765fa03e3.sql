CREATE OR REPLACE FUNCTION public.pg_advisory_xact_lock(key bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_catalog.pg_advisory_xact_lock(key);
$$;

GRANT EXECUTE ON FUNCTION public.pg_advisory_xact_lock(bigint) TO service_role;

CREATE INDEX IF NOT EXISTS idx_transactions_razorpay_auto_reference
ON public.transactions(payment_reference)
WHERE payment_method = 'razorpay_auto' AND payment_reference IS NOT NULL;