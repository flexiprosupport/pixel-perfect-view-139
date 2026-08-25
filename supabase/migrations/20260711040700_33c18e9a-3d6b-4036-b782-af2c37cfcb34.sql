ALTER TABLE public.engagement_order_items
  ADD COLUMN IF NOT EXISTS start_count bigint,
  ADD COLUMN IF NOT EXISTS current_count bigint,
  ADD COLUMN IF NOT EXISTS target_count bigint,
  ADD COLUMN IF NOT EXISTS delivered_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percentage numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_observed_count bigint,
  ADD COLUMN IF NOT EXISTS completion_locked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_engagement_order_items_tracking_watch
  ON public.engagement_order_items (status, engagement_order_id)
  WHERE status IN ('pending','processing','completed');

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

  -- Public counters can drop/flake; never move displayed progress backwards.
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

  -- Strict completion gate for tracked items: cannot complete until public target is reached.
  -- Legacy rows without start_count are left compatible until the edge functions capture baseline.
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.start_count IS NOT NULL
     AND v_qty > 0
     AND NEW.completion_locked_at IS NULL THEN
    NEW.status := 'processing';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_engagement_order_items_tracking_recompute ON public.engagement_order_items;
CREATE TRIGGER trg_engagement_order_items_tracking_recompute
  BEFORE INSERT OR UPDATE OF start_count, current_count, quantity, status, max_observed_count
  ON public.engagement_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.engagement_order_items_tracking_recompute();

UPDATE public.engagement_order_items
SET
  start_count = COALESCE(start_count, 0),
  current_count = COALESCE(current_count, start_count, 0),
  max_observed_count = COALESCE(max_observed_count, current_count, start_count, 0)
WHERE start_count IS NULL
  AND status NOT IN ('completed','cancelled','failed','partial');