
-- Drop old non-unique partial index, recreate as UNIQUE
DROP INDEX IF EXISTS public.idx_transactions_razorpay_auto_reference;
CREATE UNIQUE INDEX idx_transactions_razorpay_auto_reference_uniq
  ON public.transactions (payment_reference)
  WHERE payment_method = 'razorpay_auto' AND payment_reference IS NOT NULL;

-- Atomic credit function. Returns json: { credited: bool, duplicate: bool, new_balance: numeric }
CREATE OR REPLACE FUNCTION public.credit_wallet_razorpay(
  p_user_id uuid,
  p_payment_id text,
  p_amount_usd numeric,
  p_amount_inr numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_existing uuid;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_new_deposited numeric;
BEGIN
  -- advisory lock keyed on payment id hash to serialize concurrent retries
  v_lock_key := abs(hashtextextended(p_payment_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- idempotency check
  SELECT id INTO v_existing
  FROM public.transactions
  WHERE payment_method = 'razorpay_auto'
    AND payment_reference = p_payment_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance, 0));
  END IF;

  -- ensure wallet row, lock it
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  v_new_balance   := round(COALESCE(v_balance, 0) + p_amount_usd, 4);
  v_new_deposited := round(COALESCE(v_deposited, 0) + p_amount_usd, 4);

  UPDATE public.wallets
  SET balance = v_new_balance, total_deposited = v_new_deposited
  WHERE user_id = p_user_id;

  -- ON CONFLICT guard against race with another retry that beat us between SELECT and INSERT
  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status,
    payment_method, payment_reference, description
  ) VALUES (
    p_user_id, 'deposit', p_amount_usd, v_new_balance, 'completed',
    'razorpay_auto', p_payment_id,
    'Wallet top-up via Razorpay (₹' || p_amount_inr::text || ' exact credit)'
  )
  ON CONFLICT DO NOTHING;

  -- if conflict happened, rollback the wallet update by re-reading and adjusting? Already committed in same tx.
  -- Safer: detect conflict
  IF NOT FOUND THEN
    -- another concurrent retry already inserted; revert our wallet update
    UPDATE public.wallets
    SET balance = COALESCE(v_balance, 0), total_deposited = COALESCE(v_deposited, 0)
    WHERE user_id = p_user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance, 0));
  END IF;

  RETURN json_build_object('credited', true, 'duplicate', false, 'new_balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) TO service_role;
