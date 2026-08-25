
CREATE OR REPLACE FUNCTION public.get_provider_topup_breakdown()
RETURNS TABLE(
  provider_id text,
  provider_name text,
  service_id uuid,
  service_name text,
  service_category text,
  pending_runs bigint,
  pending_quantity bigint,
  pending_user_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH eng AS (
    SELECT s.provider_id AS pid,
           s.id AS sid,
           s.name AS sname,
           s.category AS scat,
           COUNT(*)::bigint AS runs,
           COALESCE(SUM(rs.quantity_to_send),0)::bigint AS qty,
           COALESCE(SUM((rs.quantity_to_send::numeric/1000.0) * s.price),0) AS usd
    FROM organic_run_schedule rs
    JOIN engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN services s ON s.id = eoi.service_id
    WHERE rs.status = 'pending'
    GROUP BY s.provider_id, s.id, s.name, s.category
  ),
  nrun AS (
    SELECT s.provider_id AS pid,
           s.id AS sid,
           s.name AS sname,
           s.category AS scat,
           COUNT(*)::bigint AS runs,
           COALESCE(SUM(rs.quantity_to_send),0)::bigint AS qty,
           COALESCE(SUM((rs.quantity_to_send::numeric/1000.0) * (o.price / NULLIF(o.quantity,0) * 1000)),0) AS usd
    FROM organic_run_schedule rs
    JOIN orders o ON o.id = rs.order_id
    LEFT JOIN services s ON s.id = o.service_id
    WHERE rs.status = 'pending'
    GROUP BY s.provider_id, s.id, s.name, s.category
  ),
  ord AS (
    SELECT s.provider_id AS pid,
           s.id AS sid,
           s.name AS sname,
           s.category AS scat,
           COUNT(*)::bigint AS runs,
           COALESCE(SUM(o.quantity - COALESCE(o.remains,0)),0)::bigint AS qty,
           COALESCE(SUM(o.price),0) AS usd
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    WHERE o.status IN ('pending','processing')
      AND NOT EXISTS (SELECT 1 FROM organic_run_schedule rs WHERE rs.order_id = o.id)
    GROUP BY s.provider_id, s.id, s.name, s.category
  ),
  ord_full AS (
    -- For non-organic, "pending qty" = whole order qty if not started, otherwise remains
    SELECT s.provider_id AS pid,
           s.id AS sid,
           s.name AS sname,
           s.category AS scat,
           0::bigint AS runs,
           COALESCE(SUM(CASE WHEN o.remains IS NOT NULL AND o.remains > 0 THEN o.remains ELSE o.quantity END),0)::bigint AS qty,
           0::numeric AS usd
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    WHERE o.status IN ('pending','processing')
      AND NOT EXISTS (SELECT 1 FROM organic_run_schedule rs WHERE rs.order_id = o.id)
    GROUP BY s.provider_id, s.id, s.name, s.category
  ),
  agg AS (
    SELECT pid, sid, sname, scat, runs, qty, usd FROM eng
    UNION ALL
    SELECT pid, sid, sname, scat, runs, qty, usd FROM nrun
    UNION ALL
    SELECT pid, sid, sname, scat, runs, qty, usd FROM ord
  )
  SELECT
    COALESCE(a.pid, 'unknown')::text,
    COALESCE(p.name, a.pid, 'unknown')::text,
    a.sid,
    COALESCE(a.sname,'Unknown')::text,
    COALESCE(a.scat,'Other')::text,
    SUM(a.runs)::bigint,
    SUM(a.qty)::bigint,
    ROUND(COALESCE(SUM(a.usd), 0)::numeric, 4)
  FROM agg a
  LEFT JOIN providers p ON p.id = a.pid
  GROUP BY a.pid, p.name, a.sid, a.sname, a.scat
  HAVING SUM(a.qty) > 0
  ORDER BY 1, 7 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_topup_breakdown() TO authenticated;
