DO $$
DECLARE
  i INT := 0;
  affected INT;
BEGIN
  LOOP
    i := i + 1;
    EXIT WHEN i > 50;

    -- Reduce the latest pending run of each over-planned item
    WITH totals AS (
      SELECT it.id AS item_id, it.quantity AS ordered,
             COALESCE(SUM(r.quantity_to_send), 0) AS planned
      FROM public.engagement_order_items it
      JOIN public.organic_run_schedule r ON r.engagement_order_item_id = it.id
      WHERE it.status NOT IN ('completed','cancelled')
      GROUP BY it.id, it.quantity
    ),
    over AS (
      SELECT item_id, planned - ordered AS overflow FROM totals WHERE planned > ordered
    ),
    last_pending AS (
      SELECT DISTINCT ON (r.engagement_order_item_id)
             r.id, r.quantity_to_send, o.overflow
      FROM public.organic_run_schedule r
      JOIN over o ON o.item_id = r.engagement_order_item_id
      WHERE r.status = 'pending' AND r.provider_order_id IS NULL
      ORDER BY r.engagement_order_item_id, r.scheduled_at DESC, r.run_number DESC
    )
    UPDATE public.organic_run_schedule s
    SET quantity_to_send = GREATEST(0, lp.quantity_to_send - lp.overflow),
        base_quantity    = GREATEST(0, lp.quantity_to_send - lp.overflow)
    FROM last_pending lp
    WHERE s.id = lp.id;

    GET DIAGNOSTICS affected = ROW_COUNT;

    -- Drop runs that were trimmed down to nothing
    DELETE FROM public.organic_run_schedule
    WHERE status = 'pending' AND provider_order_id IS NULL AND quantity_to_send <= 0;

    EXIT WHEN affected = 0;
  END LOOP;
END $$;