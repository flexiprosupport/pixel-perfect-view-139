
-- Allow users to reschedule their pending organic runs via a SECURITY DEFINER RPC.
-- The RPC validates ownership, charges wallet for any quantity increase atomically,
-- and updates the run. The lock trigger is bypassed only inside this RPC via a
-- per-transaction GUC.

-- 1) Update the lock trigger to honor a per-transaction bypass flag
CREATE OR REPLACE FUNCTION public.organic_run_schedule_lock_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_bypass text;
BEGIN
  -- service_role (no auth.uid) bypasses the lock
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Explicit bypass set by trusted SECURITY DEFINER RPCs (e.g. reschedule_organic_run)
  BEGIN
    v_bypass := current_setting('app.allow_run_edit', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := NULL;
  END;
  IF v_bypass = '1' THEN
    RETURN NEW;
  END IF;

  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- regular user: revert every locked column to OLD value
  NEW.order_id                 := OLD.order_id;
  NEW.engagement_order_item_id := OLD.engagement_order_item_id;
  NEW.run_number               := OLD.run_number;
  NEW.scheduled_at             := OLD.scheduled_at;
  NEW.quantity_to_send         := OLD.quantity_to_send;
  NEW.base_quantity            := OLD.base_quantity;
  NEW.variance_applied         := OLD.variance_applied;
  NEW.peak_multiplier          := OLD.peak_multiplier;
  NEW.provider_order_id        := OLD.provider_order_id;
  NEW.provider_response        := OLD.provider_response;
  NEW.error_message            := OLD.error_message;
  NEW.started_at               := OLD.started_at;
  NEW.completed_at             := OLD.completed_at;
  NEW.provider_start_count     := OLD.provider_start_count;
  NEW.provider_remains         := OLD.provider_remains;
  NEW.provider_status          := OLD.provider_status;
  NEW.provider_charge          := OLD.provider_charge;
  NEW.last_status_check        := OLD.last_status_check;
  NEW.retry_count              := OLD.retry_count;
  NEW.provider_account_id      := OLD.provider_account_id;
  NEW.provider_account_name    := OLD.provider_account_name;
  NEW.created_at               := OLD.created_at;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) RPC for the user to reschedule / resize a pending run
CREATE OR REPLACE FUNCTION public.reschedule_organic_run(
  p_run_id uuid,
  p_quantity integer,
  p_scheduled_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run record;
  v_order record;
  v_price_per_thousand numeric;
  v_qty_diff integer;
  v_extra_cost numeric := 0;
  v_balance numeric;
  v_deposited numeric;
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

  -- Fetch the run, ensure ownership via order, and lock it
  SELECT rs.*
    INTO v_run
  FROM public.organic_run_schedule rs
  JOIN public.orders o ON o.id = rs.order_id
  WHERE rs.id = p_run_id
    AND o.user_id = v_uid
  FOR UPDATE OF rs;

  IF v_run IS NULL THEN
    RAISE EXCEPTION 'Run not found or not owned by you';
  END IF;

  IF v_run.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending runs can be rescheduled';
  END IF;

  -- Compute price per 1000 from the order
  SELECT o.id, o.price, o.quantity
    INTO v_order
  FROM public.orders o
  WHERE o.id = v_run.order_id;

  IF v_order.quantity IS NULL OR v_order.quantity <= 0 THEN
    v_price_per_thousand := 0;
  ELSE
    v_price_per_thousand := (v_order.price::numeric / v_order.quantity::numeric) * 1000;
  END IF;

  v_qty_diff := p_quantity - v_run.quantity_to_send;

  IF v_qty_diff > 0 AND v_price_per_thousand > 0 THEN
    v_extra_cost := trunc((v_qty_diff::numeric / 1000.0) * v_price_per_thousand, 4);
  END IF;

  -- Charge wallet atomically if quantity increased
  IF v_extra_cost > 0 THEN
    SELECT balance, total_deposited, total_spent
      INTO v_balance, v_deposited, v_spent
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
       SET balance    = v_new_balance,
           total_spent = trunc(COALESCE(v_spent,0) + v_extra_cost, 4)
     WHERE user_id = v_uid;

    INSERT INTO public.transactions (
      user_id, type, amount, balance_after, status,
      payment_method, description
    ) VALUES (
      v_uid, 'order', -v_extra_cost, v_new_balance, 'completed',
      'wallet',
      'Reschedule run #' || COALESCE(v_run.run_number::text, '?')
        || ' (+' || v_qty_diff || ' units)'
    );
  END IF;

  -- Bypass the lock trigger for this update only
  PERFORM set_config('app.allow_run_edit', '1', true);

  UPDATE public.organic_run_schedule
     SET quantity_to_send  = p_quantity,
         base_quantity     = p_quantity,
         scheduled_at      = p_scheduled_at,
         variance_applied  = 0
   WHERE id = p_run_id;

  PERFORM set_config('app.allow_run_edit', '0', true);

  RETURN json_build_object(
    'success', true,
    'extra_charged', v_extra_cost,
    'new_balance', COALESCE(v_new_balance, v_balance, NULL),
    'quantity', p_quantity,
    'scheduled_at', p_scheduled_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_organic_run(uuid, integer, timestamptz) TO service_role;
