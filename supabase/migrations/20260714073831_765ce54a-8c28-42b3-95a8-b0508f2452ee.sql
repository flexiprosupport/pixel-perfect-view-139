
CREATE OR REPLACE FUNCTION public.credit_wallet_zapupi(p_order_id text, p_txn_id text DEFAULT NULL::text, p_utr text DEFAULT NULL::text, p_gateway_response jsonb DEFAULT NULL::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_key bigint; v_dep record; v_balance numeric; v_deposited numeric;
  v_new_balance numeric; v_credit_usd numeric; v_rate numeric := 90; v_tx_id uuid;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN RAISE EXCEPTION 'order_id required'; END IF;
  v_lock_key := abs(hashtextextended(p_order_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);
  SELECT * INTO v_dep FROM public.zapupi_deposits WHERE order_id = p_order_id FOR UPDATE;
  IF v_dep.id IS NULL THEN RAISE EXCEPTION 'Deposit order not found'; END IF;
  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
  END IF;
  -- Use 6-decimal precision so INR/rate*rate rounds back to the exact paid amount
  -- (e.g. ₹50 -> 0.555556 USD -> ₹50.00 on display, not ₹49.99).
  v_credit_usd := ROUND(v_dep.amount_inr::numeric / v_rate, 6);
  IF v_credit_usd <= 0 THEN RAISE EXCEPTION 'invalid credit amount'; END IF;
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (v_dep.user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = v_dep.user_id FOR UPDATE;
  v_new_balance := ROUND(COALESCE(v_balance,0) + v_credit_usd, 6);
  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, payment_method, payment_reference, description)
  VALUES (v_dep.user_id, 'deposit', v_credit_usd, v_new_balance, 'completed', 'zapupi', p_order_id,
    'Wallet top-up via ZapUPI (₹' || trim(to_char(v_dep.amount_inr,'FM9999999990D00')) || ')')
  RETURNING id INTO v_tx_id;
  UPDATE public.wallets SET balance = v_new_balance,
    total_deposited = ROUND(COALESCE(v_deposited,0) + v_credit_usd, 6), updated_at = now()
   WHERE user_id = v_dep.user_id;
  UPDATE public.zapupi_deposits SET status = 'success', credited = true, amount_usd = v_credit_usd,
    txn_id = COALESCE(p_txn_id, txn_id), utr = COALESCE(p_utr, utr),
    gateway_response = COALESCE(p_gateway_response, gateway_response), updated_at = now()
   WHERE id = v_dep.id;
  RETURN json_build_object('credited', true, 'duplicate', false, 'transaction_id', v_tx_id,
    'new_balance', v_new_balance, 'credited_usd', v_credit_usd, 'credited_inr', v_dep.amount_inr);
END;
$function$;
