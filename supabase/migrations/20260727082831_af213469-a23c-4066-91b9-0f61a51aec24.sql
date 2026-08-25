-- One-time cleanup: trim pending runs where the schedule plans MORE than the ordered quantity
WITH totals AS (
  SELECT i.id AS item_id,
         i.quantity AS ordered,
         COALESCE(SUM(r.quantity_to_send), 0) AS planned,
         COALESCE(SUM(r.quantity_to_send) FILTER (WHERE r.status <> 'pending'), 0) AS locked
  FROM public.engagement_order_items i
  JOIN public.organic_run_schedule r ON r.engagement_order_item_id = i.id
  WHERE i.status NOT IN ('completed','cancelled')
  GROUP BY i.id, i.quantity
),
over AS (
  SELECT item_id, ordered, planned, locked, planned - ordered AS overflow
  FROM totals
  WHERE planned > ordered
),
ranked AS (
  SELECT r.id, r.engagement_order_item_id, r.quantity_to_send,
         SUM(r.quantity_to_send) OVER (
           PARTITION BY r.engagement_order_item_id
           ORDER BY r.scheduled_at DESC, r.run_number DESC
           ROWS UNBOUNDED PRECEDING
         ) AS cum_from_end,
         o.overflow
  FROM public.organic_run_schedule r
  JOIN over o ON o.item_id = r.engagement_order_item_id
  WHERE r.status = 'pending' AND r.provider_order_id IS NULL
)
DELETE FROM public.organic_run_schedule d
USING ranked
WHERE d.id = ranked.id
  AND ranked.cum_from_end <= ranked.overflow;

-- Second pass: absorb the leftover remainder into the last remaining pending run
WITH totals AS (
  SELECT i.id AS item_id,
         i.quantity AS ordered,
         COALESCE(SUM(r.quantity_to_send), 0) AS planned
  FROM public.engagement_order_items i
  JOIN public.organic_run_schedule r ON r.engagement_order_item_id = i.id
  WHERE i.status NOT IN ('completed','cancelled')
  GROUP BY i.id, i.quantity
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
SET quantity_to_send = GREATEST(1, lp.quantity_to_send - lp.overflow),
    base_quantity = GREATEST(1, lp.quantity_to_send - lp.overflow)
FROM last_pending lp
WHERE s.id = lp.id;