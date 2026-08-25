
CREATE OR REPLACE FUNCTION public.debit_wallet_for_order(
  p_user_id uuid,
  p_amount numeric,
  p_order_id uuid DEFAULT NULL,
  p_engagement_order_id uuid DEFAULT NULL,
  p_description text DEFAULT 'Order payment'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_spent numeric;
  v_new_balance numeric;
  v_amount numeric;
  v_tx_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than zero';
  END IF;

  IF p_order_id IS NULL AND p_engagement_order_id IS NULL THEN
    RAISE EXCEPTION 'either order_id or engagement_order_id required';
  END IF;

  v_amount := trunc(p_amount::numeric, 4);

  -- Lock the wallet row to serialize concurrent debits for the same user
  SELECT balance, total_spent INTO v_balance, v_spent
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_new_balance := trunc(v_balance - v_amount, 4);

  UPDATE public.wallets
     SET balance = v_new_balance,
         total_spent = trunc(COALESCE(v_spent, 0) + v_amount, 4),
         updated_at = now()
   WHERE user_id = p_user_id;

  -- Audit trail is MANDATORY and atomic with the debit (no logging gap possible)
  INSERT INTO public.transactions(
    user_id, type, amount, balance_after, order_id, description, status
  ) VALUES (
    p_user_id, 'order_payment', v_amount, v_new_balance, p_order_id, p_description, 'completed'
  )
  RETURNING id INTO v_tx_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'debited', v_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) TO service_role;
