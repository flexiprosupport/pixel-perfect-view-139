
-- 1. Add tracking columns to orders (start_count + remains already exist)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS current_count BIGINT,
  ADD COLUMN IF NOT EXISTS target_count BIGINT,
  ADD COLUMN IF NOT EXISTS delivered_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_count BIGINT,
  ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_observed_count BIGINT,
  ADD COLUMN IF NOT EXISTS completion_locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_sync_watch
  ON public.orders (status, last_synced_at)
  WHERE status IN ('pending','processing');

-- 2. Trigger: auto-compute derived fields + gate premature completion
CREATE OR REPLACE FUNCTION public.orders_tracking_recompute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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

  -- Never let displayed count go backwards (platform removes likes/views)
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

  -- Lock completion timestamp the first time target is met
  IF v_cur >= v_target AND v_qty > 0 AND NEW.completion_locked_at IS NULL THEN
    NEW.completion_locked_at := now();
  END IF;

  -- Gate: block flipping to 'completed' unless target has actually been reached.
  -- Allow legacy rows (no start_count captured) and cancelled/failed paths.
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.start_count IS NOT NULL
     AND v_qty > 0
     AND NEW.completion_locked_at IS NULL THEN
    -- Not there yet — keep it in processing
    NEW.status := 'processing';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_tracking_recompute ON public.orders;
CREATE TRIGGER trg_orders_tracking_recompute
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_tracking_recompute();

-- 3. Backfill existing rows so the columns are populated
UPDATE public.orders
   SET current_count = COALESCE(current_count, start_count, 0),
       last_synced_at = COALESCE(last_synced_at, updated_at)
 WHERE target_count IS NULL;
