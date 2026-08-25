-- Clean up pending runs whose parent order/item is paused or cancelled
-- These will never be processed, so they clog the top of the queue
DELETE FROM public.organic_run_schedule rs
WHERE rs.status = 'pending'
  AND rs.engagement_order_item_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.engagement_order_items eoi
    JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
    WHERE eoi.id = rs.engagement_order_item_id
      AND (eoi.status IN ('paused', 'cancelled') OR eo.status IN ('paused', 'cancelled'))
  );

-- Update cleanup function to also remove stale pending runs from paused/cancelled orders going forward
CREATE OR REPLACE FUNCTION public.cleanup_old_completed_engagement_orders()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_runs INT := 0;
  deleted_items INT := 0;
  deleted_orders INT := 0;
  deleted_stale_runs INT := 0;
BEGIN
  -- Cleanup completed orders older than 1 day
  WITH target_orders AS (
    SELECT id FROM engagement_orders
    WHERE status = 'completed' AND updated_at < now() - interval '1 day'
  ),
  target_items AS (
    SELECT eoi.id FROM engagement_order_items eoi
    JOIN target_orders t ON t.id = eoi.engagement_order_id
  ),
  del_runs AS (
    DELETE FROM organic_run_schedule
    WHERE engagement_order_item_id IN (SELECT id FROM target_items)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_runs FROM del_runs;

  WITH target_orders AS (
    SELECT id FROM engagement_orders
    WHERE status = 'completed' AND updated_at < now() - interval '1 day'
  ),
  del_items AS (
    DELETE FROM engagement_order_items
    WHERE engagement_order_id IN (SELECT id FROM target_orders)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_items FROM del_items;

  WITH del_orders AS (
    DELETE FROM engagement_orders
    WHERE status = 'completed' AND updated_at < now() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_orders FROM del_orders;

  -- Also delete pending runs from paused/cancelled orders (they'll never run)
  WITH del_stale AS (
    DELETE FROM organic_run_schedule rs
    WHERE rs.status = 'pending'
      AND rs.engagement_order_item_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM engagement_order_items eoi
        JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
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
$function$;