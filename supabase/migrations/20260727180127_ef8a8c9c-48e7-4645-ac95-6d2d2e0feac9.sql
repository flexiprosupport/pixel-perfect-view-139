CREATE OR REPLACE FUNCTION public.get_due_engagement_run_ids(p_limit integer DEFAULT 250)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id FROM (
    SELECT DISTINCT ON (rs.engagement_order_item_id)
           rs.id, rs.engagement_order_item_id, rs.scheduled_at
    FROM public.organic_run_schedule rs
    JOIN public.engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
    WHERE rs.status = 'pending'
      AND rs.engagement_order_item_id IS NOT NULL
      AND rs.scheduled_at <= now() + interval '1 minute'
      AND eoi.status NOT IN ('paused','cancelled')
      AND eo.status NOT IN ('paused','cancelled')
    ORDER BY rs.engagement_order_item_id, rs.scheduled_at ASC
  ) r
  ORDER BY r.scheduled_at ASC
  LIMIT GREATEST(1, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.get_due_engagement_run_ids(integer) TO service_role;