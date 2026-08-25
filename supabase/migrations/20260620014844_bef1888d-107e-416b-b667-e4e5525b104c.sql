
-- DB-level guard: prevent 2 active (started) provider orders on same link+type+provider_account
ALTER TABLE public.organic_run_schedule
  ADD COLUMN IF NOT EXISTS rotation_lock_key text;

CREATE OR REPLACE FUNCTION public.compute_rotation_lock_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
  v_type text;
BEGIN
  -- Only lock when run is actively held at a provider
  IF NEW.status = 'started'
     AND NEW.provider_order_id IS NOT NULL
     AND NEW.provider_account_id IS NOT NULL
     AND NEW.engagement_order_item_id IS NOT NULL THEN

    SELECT lower(btrim(eo.link)), lower(btrim(eoi.engagement_type))
      INTO v_link, v_type
    FROM public.engagement_order_items eoi
    JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
    WHERE eoi.id = NEW.engagement_order_item_id;

    IF v_link IS NOT NULL AND v_type IS NOT NULL AND v_link <> '' AND v_type <> '' THEN
      NEW.rotation_lock_key := v_link || '||' || v_type || '||' || NEW.provider_account_id::text;
    ELSE
      NEW.rotation_lock_key := NULL;
    END IF;
  ELSE
    NEW.rotation_lock_key := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_rotation_lock_key ON public.organic_run_schedule;
CREATE TRIGGER trg_compute_rotation_lock_key
BEFORE INSERT OR UPDATE OF status, provider_order_id, provider_account_id, engagement_order_item_id
ON public.organic_run_schedule
FOR EACH ROW EXECUTE FUNCTION public.compute_rotation_lock_key();

-- Backfill existing started rows
UPDATE public.organic_run_schedule rs
SET rotation_lock_key = lower(btrim(eo.link)) || '||' || lower(btrim(eoi.engagement_type)) || '||' || rs.provider_account_id::text
FROM public.engagement_order_items eoi
JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
WHERE rs.engagement_order_item_id = eoi.id
  AND rs.status = 'started'
  AND rs.provider_order_id IS NOT NULL
  AND rs.provider_account_id IS NOT NULL
  AND eo.link IS NOT NULL
  AND eoi.engagement_type IS NOT NULL;

-- Unique partial index: only one active row per (link, type, provider_account)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_rotation_lock
  ON public.organic_run_schedule (rotation_lock_key)
  WHERE rotation_lock_key IS NOT NULL;
