ALTER TABLE public.engagement_orders
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.engagement_orders
SET completed_at = COALESCE(completed_at, created_at)
WHERE status = 'completed'
  AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_engagement_order_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_engagement_order_completed_at_trigger ON public.engagement_orders;
CREATE TRIGGER set_engagement_order_completed_at_trigger
BEFORE UPDATE ON public.engagement_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_engagement_order_completed_at();

CREATE OR REPLACE FUNCTION public.cleanup_old_completed_engagement_orders()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_runs INT := 0;
  deleted_items INT := 0;
  deleted_orders INT := 0;
  deleted_stale_runs INT := 0;
BEGIN
  WITH target_orders AS (
    SELECT id
    FROM public.engagement_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '1 day'
  ),
  target_items AS (
    SELECT eoi.id
    FROM public.engagement_order_items eoi
    JOIN target_orders t ON t.id = eoi.engagement_order_id
  ),
  del_runs AS (
    DELETE FROM public.organic_run_schedule
    WHERE engagement_order_item_id IN (SELECT id FROM target_items)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_runs FROM del_runs;

  WITH target_orders AS (
    SELECT id
    FROM public.engagement_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '1 day'
  ),
  del_items AS (
    DELETE FROM public.engagement_order_items
    WHERE engagement_order_id IN (SELECT id FROM target_orders)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_items FROM del_items;

  WITH del_orders AS (
    DELETE FROM public.engagement_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_orders FROM del_orders;

  WITH del_stale AS (
    DELETE FROM public.organic_run_schedule rs
    WHERE rs.status = 'pending'
      AND rs.engagement_order_item_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.engagement_order_items eoi
        JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
        WHERE eoi.id = rs.engagement_order_item_id
          AND (eoi.status IN ('paused','cancelled') OR eo.status IN ('paused','cancelled'))
      )
    RETURNING 1
  )
  SELECT count(*) INTO deleted_stale_runs FROM del_stale;

  RETURN json_build_object(
    'deleted_runs', deleted_runs,
    'deleted_items', deleted_items,
    'deleted_orders', deleted_orders,
    'deleted_stale_runs', deleted_stale_runs,
    'ran_at', now()
  );
END;
$$;

SELECT public.cleanup_old_completed_engagement_orders();