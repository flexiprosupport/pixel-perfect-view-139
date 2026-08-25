CREATE OR REPLACE FUNCTION public.credit_wallet_oxapay(p_order_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep record;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_credit_usd numeric;
  v_credit_inr numeric;
  v_tx_id uuid;
  v_lock_key bigint;
  v_rate numeric := 90;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN
    RAISE EXCEPTION 'order_id required';
  END IF;

  v_lock_key := abs(hashtextextended(p_order_id, 88));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_dep FROM public.oxapay_deposits WHERE order_id = p_order_id FOR UPDATE;
  IF v_dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found: %', p_order_id;
  END IF;

  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
  END IF;

  IF lower(v_dep.status) NOT IN ('paid','confirmed','completed','success') THEN
    RETURN json_build_object('credited', false, 'reason', 'not_success', 'status', v_dep.status);
  END IF;

  -- Wallet balances/prices are stored internally as USD units and displayed as INR in the UI.
  -- Therefore ₹90 paid must credit 1.0000 wallet unit, which displays as ₹90.
  v_credit_inr := ROUND(v_dep.amount_inr::numeric, 2);
  v_credit_usd := ROUND((v_credit_inr / v_rate)::numeric, 4);

  IF v_credit_inr <= 0 OR v_credit_usd <= 0 THEN
    RAISE EXCEPTION 'invalid credit amount';
  END IF;

  -- Hard guard against currency mismatch: stored USD must match stored INR at the fixed platform rate.
  IF ABS(ROUND(v_dep.amount_usd::numeric, 4) - v_credit_usd) > 0.0112 THEN
    RAISE EXCEPTION 'currency mismatch for %: amount_usd %, amount_inr %', p_order_id, v_dep.amount_usd, v_dep.amount_inr;
  END IF;

  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (v_dep.user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = v_dep.user_id FOR UPDATE;

  v_new_balance := ROUND(COALESCE(v_balance,0) + v_credit_usd, 4);

  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status, payment_method, payment_reference, description
  ) VALUES (
    v_dep.user_id, 'deposit', v_credit_usd, v_new_balance, 'completed', 'oxapay', p_order_id,
    'OxaPay crypto deposit (₹' || v_credit_inr || ' / $' || v_credit_usd ||
    COALESCE(' via ' || v_dep.pay_currency, '') || ')'
  ) RETURNING id INTO v_tx_id;

  UPDATE public.wallets
     SET balance = v_new_balance,
         total_deposited = ROUND(COALESCE(v_deposited,0) + v_credit_usd, 4),
         updated_at = now()
   WHERE user_id = v_dep.user_id;

  UPDATE public.oxapay_deposits
     SET credited = true, updated_at = now()
   WHERE order_id = p_order_id;

  RETURN json_build_object(
    'credited', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'credited_inr', v_credit_inr,
    'credited_usd', v_credit_usd
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet_oxapay(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_oxapay(text) TO service_role;