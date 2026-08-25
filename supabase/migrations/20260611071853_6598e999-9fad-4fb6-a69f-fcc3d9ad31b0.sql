
-- =========================================================
-- Harden organic_run_schedule RLS: lock financial/provider
-- fields so regular users can only insert/update safe values.
-- Service role + admin bypass these restrictions for backend
-- processing and admin tooling.
-- =========================================================

-- 1) Recreate INSERT policy with strict WITH CHECK that pins
--    sensitive fields. Users can still queue runs for their own
--    orders, but cannot pre-set provider charges, quantities
--    that exceed sane bounds, or assign providers themselves.
DROP POLICY IF EXISTS "Users insert runs for own engagement orders" ON public.organic_run_schedule;

CREATE POLICY "Users insert runs for own engagement orders"
ON public.organic_run_schedule
FOR INSERT
TO authenticated
WITH CHECK (
  -- ownership check (same as before)
  (
    EXISTS (
      SELECT 1
      FROM engagement_order_items eoi
      JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
      WHERE eoi.id = organic_run_schedule.engagement_order_item_id
        AND eo.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = organic_run_schedule.order_id
        AND orders.user_id = auth.uid()
    )
  )
  -- field-level lockdown: provider/financial fields must be NULL,
  -- status must be pending, quantity must be sane (1..1_000_000),
  -- and counters/timestamps must be unset.
  AND status = 'pending'
  AND quantity_to_send IS NOT NULL
  AND quantity_to_send > 0
  AND quantity_to_send <= 1000000
  AND provider_charge IS NULL
  AND provider_account_id IS NULL
  AND provider_account_name IS NULL
  AND provider_order_id IS NULL
  AND provider_response IS NULL
  AND provider_status IS NULL
  AND provider_start_count IS NULL
  AND provider_remains IS NULL
  AND error_message IS NULL
  AND started_at IS NULL
  AND completed_at IS NULL
  AND last_status_check IS NULL
  AND COALESCE(retry_count, 0) = 0
);

-- 2) Recreate UPDATE policy so users can only touch their own
--    pending rows AND the NEW row's status must be one of the
--    user-allowed values. Column-level lock for the rest is
--    enforced via the trigger below (RLS WITH CHECK cannot
--    compare OLD vs NEW).
DROP POLICY IF EXISTS "Users update own pending runs" ON public.organic_run_schedule;

CREATE POLICY "Users update own pending runs"
ON public.organic_run_schedule
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = organic_run_schedule.order_id
        AND orders.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM engagement_order_items eoi
      JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
      WHERE eoi.id = organic_run_schedule.engagement_order_item_id
        AND eo.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  status IN ('pending', 'cancelled')
  AND (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = organic_run_schedule.order_id
        AND orders.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM engagement_order_items eoi
      JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
      WHERE eoi.id = organic_run_schedule.engagement_order_item_id
        AND eo.user_id = auth.uid()
    )
  )
);

-- 3) Trigger: when a NON-admin, NON-service-role caller updates
--    a row, force every sensitive column to retain its OLD value.
--    Only `status` can be changed (to 'cancelled') by users.
CREATE OR REPLACE FUNCTION public.organic_run_schedule_lock_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- service_role (no auth.uid) and admins bypass the lock
  IF v_uid IS NULL THEN
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

  -- status: only allow change to 'cancelled' (or keep same value)
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organic_run_schedule_lock_user_columns ON public.organic_run_schedule;
CREATE TRIGGER trg_organic_run_schedule_lock_user_columns
BEFORE UPDATE ON public.organic_run_schedule
FOR EACH ROW
EXECUTE FUNCTION public.organic_run_schedule_lock_user_columns();

-- 4) Lock down EXECUTE on the helper so it can only run as the
--    trigger (security definer); revoke from public roles.
REVOKE ALL ON FUNCTION public.organic_run_schedule_lock_user_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.organic_run_schedule_lock_user_columns() FROM anon, authenticated;
