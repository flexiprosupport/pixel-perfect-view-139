CREATE OR REPLACE FUNCTION public.credit_wallet_razorpay(p_user_id uuid, p_payment_id text, p_amount_usd numeric, p_amount_inr numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_key bigint;
  v_existing uuid;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_new_deposited numeric;
  v_inserted_id uuid;
  v_credit_usd numeric;
  v_amount_inr numeric;
  v_rate numeric := 83.5;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  IF COALESCE(btrim(p_payment_id), '') = '' THEN
    RAISE EXCEPTION 'payment_id required';
  END IF;

  IF p_amount_inr IS NULL OR p_amount_inr <= 0 THEN
    RAISE EXCEPTION 'amount_inr must be greater than zero';
  END IF;

  -- Ignore caller-provided USD and derive the wallet credit only from the real paid INR amount.
  -- trunc() is intentional so the system can never over-credit beyond the paid amount.
  v_amount_inr := trunc(p_amount_inr::numeric, 2);
  v_credit_usd := trunc((v_amount_inr / v_rate)::numeric, 4);

  IF v_credit_usd <= 0 THEN
    RAISE EXCEPTION 'computed credit amount invalid';
  END IF;

  v_lock_key := abs(hashtextextended(p_payment_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT id INTO v_existing
  FROM public.transactions
  WHERE payment_method = 'razorpay_auto'
    AND payment_reference = p_payment_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT balance INTO v_balance
    FROM public.wallets
    WHERE user_id = p_user_id;

    RETURN json_build_object(
      'credited', false,
      'duplicate', true,
      'new_balance', COALESCE(v_balance, 0),
      'credited_usd', v_credit_usd,
      'credited_inr', v_amount_inr
    );
  END IF;

  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := trunc(COALESCE(v_balance, 0) + v_credit_usd, 4);
  v_new_deposited := trunc(COALESCE(v_deposited, 0) + v_credit_usd, 4);

  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status,
    payment_method, payment_reference, description
  ) VALUES (
    p_user_id, 'deposit', v_credit_usd, v_new_balance, 'completed',
    'razorpay_auto', p_payment_id,
    'Wallet top-up via Razorpay (₹' || trim(to_char(v_amount_inr, 'FM9999999990D00')) || ' exact credit)'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN json_build_object(
      'credited', false,
      'duplicate', true,
      'new_balance', COALESCE(v_balance, 0),
      'credited_usd', v_credit_usd,
      'credited_inr', v_amount_inr
    );
  END IF;

  UPDATE public.wallets
  SET balance = v_new_balance,
      total_deposited = v_new_deposited
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'credited', true,
    'duplicate', false,
    'new_balance', v_new_balance,
    'credited_usd', v_credit_usd,
    'credited_inr', v_amount_inr
  );
END;
$function$;