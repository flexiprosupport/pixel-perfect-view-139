CREATE OR REPLACE FUNCTION public.reschedule_organic_run(p_run_id uuid, p_quantity integer, p_scheduled_at timestamp with time zone)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_run record;
  v_order_price numeric;
  v_order_quantity integer;
  v_price_per_thousand numeric := 0;
  v_qty_diff integer;
  v_extra_cost numeric := 0;
  v_balance numeric;
  v_spent numeric;
  v_new_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000000 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Scheduled time required';
  END IF;

  SELECT
    rs.id,
    rs.order_id,
    rs.engagement_order_item_id,
    rs.run_number,
    rs.status,
    rs.quantity_to_send,
    rs.base_quantity,
    o.user_id AS order_user_id,
    o.price AS order_price,
    o.quantity AS order_quantity,
    eo.user_id AS engagement_order_user_id,
    s.price AS service_price
  INTO v_run
  FROM public.organic_run_schedule rs
  LEFT JOIN public.orders o
    ON o.id = rs.order_id
  LEFT JOIN public.engagement_order_items eoi
    ON eoi.id = rs.engagement_order_item_id
  LEFT JOIN public.engagement_orders eo
    ON eo.id = eoi.engagement_order_id
  LEFT JOIN public.services s
    ON s.id = eoi.service_id
  WHERE rs.id = p_run_id
    AND (
      o.user_id = v_uid
      OR eo.user_id = v_uid
    )
  FOR UPDATE OF rs;

  IF v_run IS NULL THEN
    RAISE EXCEPTION 'Run not found or not owned by you';
  END IF;

  IF v_run.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending runs can be rescheduled';
  END IF;

  IF v_run.order_id IS NOT NULL THEN
    v_order_price := COALESCE(v_run.order_price, 0);
    v_order_quantity := COALESCE(v_run.order_quantity, 0);

    IF v_order_quantity > 0 THEN
      v_price_per_thousand := (v_order_price::numeric / v_order_quantity::numeric) * 1000;
    END IF;
  ELSIF v_run.engagement_order_item_id IS NOT NULL THEN
    v_price_per_thousand := COALESCE(v_run.service_price, 0);
  END IF;

  v_qty_diff := p_quantity - v_run.quantity_to_send;

  IF v_qty_diff > 0 AND v_price_per_thousand > 0 THEN
    v_extra_cost := trunc((v_qty_diff::numeric / 1000.0) * v_price_per_thousand, 4);
  END IF;

  IF v_extra_cost > 0 THEN
    SELECT balance, total_spent
      INTO v_balance, v_spent
    FROM public.wallets
    WHERE user_id = v_uid
    FOR UPDATE;

    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF v_balance < v_extra_cost THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_new_balance := trunc(v_balance - v_extra_cost, 4);

    UPDATE public.wallets
       SET balance = v_new_balance,
           total_spent = trunc(COALESCE(v_spent, 0) + v_extra_cost, 4)
     WHERE user_id = v_uid;

    INSERT INTO public.transactions (
      user_id,
      type,
      amount,
      balance_after,
      status,
      payment_method,
      order_id,
      description
    )
    VALUES (
      v_uid,
      'order',
      -v_extra_cost,
      v_new_balance,
      'completed',
      'wallet',
      v_run.order_id,
      'Reschedule run #' || COALESCE(v_run.run_number::text, '?') || ' (+' || v_qty_diff || ' units)'
    );
  END IF;

  PERFORM set_config('app.allow_run_edit', '1', true);

  UPDATE public.organic_run_schedule
     SET quantity_to_send = p_quantity,
         base_quantity = p_quantity,
         scheduled_at = p_scheduled_at,
         variance_applied = 0
   WHERE id = p_run_id
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run could not be updated';
  END IF;

  PERFORM set_config('app.allow_run_edit', '0', true);

  RETURN json_build_object(
    'success', true,
    'extra_charged', v_extra_cost,
    'new_balance', COALESCE(v_new_balance, v_balance, NULL),
    'quantity', p_quantity,
    'scheduled_at', p_scheduled_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) TO service_role;