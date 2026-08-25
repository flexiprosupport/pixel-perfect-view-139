-- 1) Relax completion gate on engagement_order_items trigger.
-- Only block completion when we have a REAL public baseline (start_count > 0).
-- Services where the provider does not return a public start count (typical for
-- likes/comments/shares/subscribers) end up with start_count = 0 and can never
-- reach the public target — for those, trust the edge-function-computed status.
CREATE OR REPLACE FUNCTION public.engagement_order_items_tracking_recompute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_start bigint;
  v_qty bigint;
  v_cur bigint;
  v_target bigint;
  v_delivered bigint;
  v_remaining bigint;
  v_progress numeric(5,2);
BEGIN
  v_start := COALESCE(NEW.start_count, 0);
  v_qty := COALESCE(NEW.quantity, 0);
  v_cur := COALESCE(NEW.current_count, v_start);

  IF NEW.max_observed_count IS NULL OR v_cur > NEW.max_observed_count THEN
    NEW.max_observed_count := v_cur;
  END IF;

  v_cur := COALESCE(NEW.max_observed_count, v_cur);
  NEW.current_count := v_cur;

  v_target := v_start + v_qty;
  NEW.target_count := v_target;

  v_delivered := GREATEST(0, v_cur - v_start);
  IF v_qty > 0 THEN
    v_delivered := LEAST(v_delivered, v_qty);
  END IF;
  NEW.delivered_count := v_delivered;

  v_remaining := GREATEST(0, v_target - v_cur);
  NEW.remaining_count := v_remaining;

  IF v_qty > 0 THEN
    v_progress := LEAST(100, ROUND((v_delivered::numeric / v_qty::numeric) * 100, 2));
  ELSE
    v_progress := 0;
  END IF;
  NEW.progress_percentage := v_progress;

  IF v_cur >= v_target AND v_qty > 0 AND NEW.completion_locked_at IS NULL THEN
    NEW.completion_locked_at := now();
  END IF;

  -- Strict completion gate ONLY when we have a real public baseline to check against.
  -- start_count = 0 means the provider does not expose a public counter for this
  -- service type, so completion is decided by run-level delivery outcomes.
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.start_count IS NOT NULL
     AND NEW.start_count > 0
     AND v_qty > 0
     AND NEW.completion_locked_at IS NULL THEN
    NEW.status := 'processing';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Same relaxation for legacy single-order tracking trigger.
CREATE OR REPLACE FUNCTION public.orders_tracking_recompute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_start BIGINT;
  v_qty   BIGINT;
  v_cur   BIGINT;
  v_target BIGINT;
  v_delivered BIGINT;
  v_remaining BIGINT;
  v_progress NUMERIC(5,2);
BEGIN
  v_start := COALESCE(NEW.start_count, 0);
  v_qty   := COALESCE(NEW.quantity, 0);
  v_cur   := COALESCE(NEW.current_count, v_start);

  IF NEW.max_observed_count IS NULL OR v_cur > NEW.max_observed_count THEN
    NEW.max_observed_count := v_cur;
  END IF;
  v_cur := NEW.max_observed_count;
  NEW.current_count := v_cur;

  v_target := v_start + v_qty;
  NEW.target_count := v_target;

  v_delivered := GREATEST(0, v_cur - v_start);
  IF v_qty > 0 THEN
    v_delivered := LEAST(v_delivered, v_qty);
  END IF;
  NEW.delivered_count := v_delivered;

  v_remaining := GREATEST(0, v_target - v_cur);
  NEW.remaining_count := v_remaining;

  IF v_qty > 0 THEN
    v_progress := LEAST(100, ROUND((v_delivered::numeric / v_qty::numeric) * 100, 2));
  ELSE
    v_progress := 0;
  END IF;
  NEW.progress_percentage := v_progress;

  IF v_cur >= v_target AND v_qty > 0 AND NEW.completion_locked_at IS NULL THEN
    NEW.completion_locked_at := now();
  END IF;

  -- Only enforce completion gate when we have a real public baseline.
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.start_count IS NOT NULL
     AND NEW.start_count > 0
     AND v_qty > 0
     AND NEW.completion_locked_at IS NULL THEN
    NEW.status := 'processing';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Backfill correction: where an item has start_count = 0 but its runs actually
-- captured a real provider_start_count, promote the item's start_count to that value.
UPDATE public.engagement_order_items eoi
   SET start_count = sub.first_start
  FROM (
    SELECT DISTINCT ON (engagement_order_item_id)
           engagement_order_item_id,
           provider_start_count::bigint AS first_start
      FROM public.organic_run_schedule
     WHERE engagement_order_item_id IS NOT NULL
       AND provider_start_count IS NOT NULL
       AND provider_start_count > 0
     ORDER BY engagement_order_item_id, run_number ASC NULLS LAST, created_at ASC
  ) sub
 WHERE eoi.id = sub.engagement_order_item_id
   AND COALESCE(eoi.start_count, 0) = 0
   AND eoi.status NOT IN ('cancelled','failed');

-- 4) Unstick items where every run has terminal outcome and total delivery
-- meets the ordered quantity, but the item is still 'processing' due to the
-- old strict gate. Uses a delivery-based completion signal (provider_remains
-- consumed, or run marked completed by provider).
WITH run_delivery AS (
  SELECT engagement_order_item_id AS item_id,
         SUM(
           CASE
             WHEN LOWER(COALESCE(provider_status, status, '')) IN ('completed','complete','success')
               THEN COALESCE(quantity_to_send, 0)
             WHEN provider_remains IS NOT NULL
               THEN GREATEST(0, COALESCE(quantity_to_send, 0) - COALESCE(provider_remains, 0))
             ELSE 0
           END
         )::bigint AS delivered_sum,
         BOOL_AND(status IN ('completed','cancelled','failed')) AS all_terminal
    FROM public.organic_run_schedule
   WHERE engagement_order_item_id IS NOT NULL
   GROUP BY engagement_order_item_id
)
UPDATE public.engagement_order_items eoi
   SET status = 'completed',
       completion_locked_at = COALESCE(eoi.completion_locked_at, now())
  FROM run_delivery rd
 WHERE eoi.id = rd.item_id
   AND rd.all_terminal = true
   AND eoi.status = 'processing'
   AND COALESCE(eoi.quantity, 0) > 0
   AND rd.delivered_sum >= eoi.quantity;

-- 5) Roll up parent engagement_orders whose every item is now terminal.
UPDATE public.engagement_orders eo
   SET status = CASE
                  WHEN sub.completed_count = sub.total_count THEN 'completed'
                  WHEN sub.completed_count > 0 THEN 'partial'
                  ELSE 'failed'
                END,
       completed_at = COALESCE(eo.completed_at, now()),
       updated_at = now()
  FROM (
    SELECT engagement_order_id,
           COUNT(*) FILTER (WHERE status IN ('completed','partial','failed','cancelled')) AS terminal_count,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
           COUNT(*) AS total_count
      FROM public.engagement_order_items
     GROUP BY engagement_order_id
  ) sub
 WHERE eo.id = sub.engagement_order_id
   AND eo.status = 'processing'
   AND sub.terminal_count = sub.total_count;