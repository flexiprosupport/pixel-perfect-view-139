
-- Mark all existing untracked "Admin deposit" rows so they're identifiable
UPDATE public.transactions
   SET payment_method = 'legacy_admin'
 WHERE type = 'deposit'
   AND payment_method IS NULL
   AND description ILIKE 'Admin deposit%';

-- Hard trigger: block any future deposit without a known payment method
CREATE OR REPLACE FUNCTION public.enforce_deposit_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN (
      'zapupi', 'manual_admin', 'razorpay', 'usdt_bep20', 'razorpay_manual', 'legacy_admin'
    ) THEN
      RAISE EXCEPTION 'Forbidden: deposit requires a known payment_method (got: %). All credits must go through ZapUPI webhook or admin-wallet-action.', COALESCE(NEW.payment_method, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_deposit_provenance ON public.transactions;
CREATE TRIGGER trg_enforce_deposit_provenance
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deposit_provenance();

-- And the same idea on wallets.total_deposited bumps without a transaction:
-- Add a trigger that requires every wallet balance INCREASE to have a matching
-- transactions row inserted in the same statement (best-effort: check that a
-- recent transaction row exists for this user when balance increases).
CREATE OR REPLACE FUNCTION public.enforce_wallet_credit_trail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric;
  v_recent_count int;
BEGIN
  v_delta := COALESCE(NEW.balance,0) - COALESCE(OLD.balance,0);
  -- Only enforce on credits (increases). Decreases (debits/refunds) untouched.
  IF v_delta > 0.0001 THEN
    -- A matching transaction row must exist within last 5 seconds for this user
    SELECT COUNT(*) INTO v_recent_count
      FROM public.transactions
     WHERE user_id = NEW.user_id
       AND created_at > now() - interval '5 seconds'
       AND type IN ('deposit', 'refund')
       AND status = 'completed';
    IF v_recent_count = 0 THEN
      RAISE EXCEPTION 'Forbidden: wallet credit (+%) requires a matching transactions row.', v_delta;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_wallet_credit_trail ON public.wallets;
CREATE TRIGGER trg_enforce_wallet_credit_trail
  BEFORE UPDATE OF balance ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_wallet_credit_trail();
