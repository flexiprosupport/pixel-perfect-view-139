
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_refund numeric := 0;
  v_refund_qty integer := 0;
  v_pending_qty integer := 0;
  v_balance numeric;
  v_spent numeric;
  v_new_balance numeric;
BEGIN
  IF p_order_id IS NULL OR p_actor IS NULL THEN
    RAISE EXCEPTION 'order_id and actor required';
  END IF;

  -- Lock the order row so concurrent cancel calls serialize
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Authorization
  IF NOT p_is_admin AND v_order.user_id <> p_actor THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Idempotent: if already cancelled, do nothing (no double refund)
  IF v_order.status = 'cancelled' THEN
    RETURN json_build_object('success', true, 'already_cancelled', true, 'refund_amount', 0);
  END IF;

  IF v_order.is_organic_mode THEN
    -- Cancel only currently-pending runs and compute proportional refund
    PERFORM set_config('app.allow_run_edit','1',true);

    SELECT COALESCE(SUM(quantity_to_send),0) INTO v_pending_qty
      FROM public.organic_run_schedule
     WHERE order_id = v_order.id AND status = 'pending';

    UPDATE public.organic_run_schedule
       SET status = 'cancelled'
     WHERE order_id = v_order.id AND status = 'pending';

    PERFORM set_config('app.allow_run_edit','0',true);

    v_refund_qty := v_pending_qty;
    IF v_pending_qty > 0 AND v_order.quantity > 0 THEN
      v_refund := trunc((v_pending_qty::numeric / v_order.quantity::numeric) * v_order.price::numeric, 4);
    END IF;
  ELSE
    -- Refund only if order was strictly pending (not yet sent to provider)
    IF v_order.status = 'pending' THEN
      v_refund := trunc(v_order.price::numeric, 4);
      v_refund_qty := v_order.quantity;
    END IF;
  END IF;

  -- Flip order status while still holding the lock
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = v_order.id;

  -- Atomic wallet credit + transaction insert
  IF v_refund > 0 THEN
    SELECT balance, total_spent INTO v_balance, v_spent
      FROM public.wallets WHERE user_id = v_order.user_id FOR UPDATE;

    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet not found for refund';
    END IF;

    v_new_balance := trunc(COALESCE(v_balance,0) + v_refund, 4);

    UPDATE public.wallets
       SET balance = v_new_balance,
           total_spent = GREATEST(0, trunc(COALESCE(v_spent,0) - v_refund, 4)),
           updated_at = now()
     WHERE user_id = v_order.user_id;

    INSERT INTO public.transactions (
      user_id, type, amount, balance_after, order_id, description, status
    ) VALUES (
      v_order.user_id, 'refund', v_refund, v_new_balance, v_order.id,
      'Refund for cancelled order #' || v_order.order_number, 'completed'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund,
    'refunded_quantity', v_refund_qty,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_with_refund(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, uuid, boolean) TO service_role;
