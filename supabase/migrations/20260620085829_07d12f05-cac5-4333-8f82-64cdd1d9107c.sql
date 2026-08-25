
-- 1) Force balance_after to NULL on user-inserted transactions (server computes the real value)
DROP POLICY IF EXISTS "Users create own deposit transactions" ON public.transactions;
CREATE POLICY "Users create own deposit transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type = 'deposit'
  AND status = 'pending'
  AND amount IS NOT NULL
  AND amount > 0
  AND amount <= 1000
  AND balance_after IS NULL
  AND payment_method IN ('upi','manual','bank_transfer')
);

-- 2) Harden organic_run_schedule column-lock trigger:
--    Regular users can no longer change scheduled_at, base_quantity, quantity_to_send,
--    run_number, or variance_applied via direct UPDATE. Those edits require the
--    reschedule_organic_run RPC (which sets app.allow_run_edit='1' before updating).
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
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

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

  -- Regular user: revert all provider/internal columns
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

  -- Lock sensitive scheduling/quantity fields — must go through reschedule RPC
  NEW.scheduled_at     := OLD.scheduled_at;
  NEW.quantity_to_send := OLD.quantity_to_send;
  NEW.base_quantity    := OLD.base_quantity;
  NEW.variance_applied := OLD.variance_applied;

  -- Status: only allow change to 'cancelled'
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$function$;
