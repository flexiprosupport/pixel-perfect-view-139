
CREATE OR REPLACE FUNCTION public.get_provider_topup_plan()
RETURNS TABLE (
  provider_id text,
  provider_name text,
  pending_runs bigint,
  pending_user_usd numeric,
  markup_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH eng AS (
    SELECT s.provider_id,
           COUNT(*)::bigint AS runs,
           SUM((rs.quantity_to_send::numeric / 1000.0) * s.price) AS usd
    FROM organic_run_schedule rs
    JOIN engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN services s ON s.id = eoi.service_id
    WHERE rs.status = 'pending'
    GROUP BY s.provider_id
  ),
  nrun AS (
    SELECT s.provider_id,
           COUNT(*)::bigint AS runs,
           SUM((rs.quantity_to_send::numeric / 1000.0) * (o.price / NULLIF(o.quantity,0) * 1000)) AS usd
    FROM organic_run_schedule rs
    JOIN orders o ON o.id = rs.order_id
    LEFT JOIN services s ON s.id = o.service_id
    WHERE rs.status = 'pending'
    GROUP BY s.provider_id
  ),
  ord AS (
    SELECT s.provider_id,
           COUNT(*)::bigint AS runs,
           SUM(o.price) AS usd
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    WHERE o.status IN ('pending','processing')
      AND NOT EXISTS (SELECT 1 FROM organic_run_schedule rs WHERE rs.order_id = o.id)
    GROUP BY s.provider_id
  ),
  agg AS (
    SELECT provider_id, runs, usd FROM eng
    UNION ALL
    SELECT provider_id, runs, usd FROM nrun
    UNION ALL
    SELECT provider_id, runs, usd FROM ord
  )
  SELECT
    COALESCE(a.provider_id, 'unknown') AS provider_id,
    COALESCE(p.name, a.provider_id, 'unknown') AS provider_name,
    SUM(a.runs)::bigint AS pending_runs,
    ROUND(COALESCE(SUM(a.usd), 0)::numeric, 4) AS pending_user_usd,
    COALESCE((SELECT global_markup_percent FROM platform_settings LIMIT 1), 0)::numeric AS markup_percent
  FROM agg a
  LEFT JOIN providers p ON p.id = a.provider_id
  GROUP BY a.provider_id, p.name
  HAVING SUM(a.runs) > 0
  ORDER BY 4 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_topup_plan() TO authenticated;
