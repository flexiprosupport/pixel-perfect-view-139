
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

  -- Trusted RPC bypass
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

  -- Regular user: revert all sensitive columns
  NEW.order_id                 := OLD.order_id;
  NEW.engagement_order_item_id := OLD.engagement_order_item_id;
  NEW.run_number               := OLD.run_number;
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

  -- Status: only allow change to 'cancelled'
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  -- Allow edits to scheduled_at, variance_applied, base_quantity, quantity_to_send
  -- BUT a direct increase is not allowed without the RPC bypass (which also charges wallet)
  IF COALESCE(NEW.quantity_to_send, 0) > COALESCE(OLD.quantity_to_send, 0) THEN
    NEW.quantity_to_send := OLD.quantity_to_send;
    NEW.base_quantity    := OLD.base_quantity;
  END IF;

  -- Don't let quantity be set to NULL/<=0
  IF NEW.quantity_to_send IS NULL OR NEW.quantity_to_send <= 0 THEN
    NEW.quantity_to_send := OLD.quantity_to_send;
    NEW.base_quantity    := OLD.base_quantity;
  END IF;

  RETURN NEW;
END;
$function$;
