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
BEGIN
  -- Per-payment advisory lock to serialize concurrent retries for same payment_id
  v_lock_key := abs(hashtextextended(p_payment_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Fast idempotency check
  SELECT id INTO v_existing
  FROM public.transactions
  WHERE payment_method = 'razorpay_auto'
    AND payment_reference = p_payment_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance, 0));
  END IF;

  -- Ensure wallet row exists, then lock it
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  v_new_balance   := round(COALESCE(v_balance, 0) + p_amount_usd, 4);
  v_new_deposited := round(COALESCE(v_deposited, 0) + p_amount_usd, 4);

  -- Insert transaction FIRST (relies on unique index on payment_reference WHERE payment_method='razorpay_auto')
  -- If a concurrent caller beat us, ON CONFLICT DO NOTHING returns no row and we abort without touching wallet.
  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status,
    payment_method, payment_reference, description
  ) VALUES (
    p_user_id, 'deposit', p_amount_usd, v_new_balance, 'completed',
    'razorpay_auto', p_payment_id,
    'Wallet top-up via Razorpay (₹' || p_amount_inr::text || ' exact credit)'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    -- Another concurrent call already credited this payment_id. Do NOT touch wallet.
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance, 0));
  END IF;

  -- Only now apply wallet credit (safe — transaction row is guaranteed unique)
  UPDATE public.wallets
  SET balance = v_new_balance, total_deposited = v_new_deposited
  WHERE user_id = p_user_id;

  RETURN json_build_object('credited', true, 'duplicate', false, 'new_balance', v_new_balance);
END;
$function$;