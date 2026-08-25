
CREATE OR REPLACE FUNCTION public.get_top_pending_users(p_limit int DEFAULT 5)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  wallet_balance numeric,
  total_deposited numeric,
  total_spent numeric,
  pending_orders bigint,
  pending_value_usd numeric
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
    SELECT eo.user_id AS uid,
           COUNT(*)::bigint AS cnt,
           COALESCE(SUM((rs.quantity_to_send::numeric/1000.0) * s.price),0) AS usd
    FROM organic_run_schedule rs
    JOIN engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
    JOIN services s ON s.id = eoi.service_id
    WHERE rs.status = 'pending'
    GROUP BY eo.user_id
  ),
  nord AS (
    SELECT o.user_id AS uid,
           COUNT(*)::bigint AS cnt,
           COALESCE(SUM(o.price),0) AS usd
    FROM orders o
    WHERE o.status IN ('pending','processing')
    GROUP BY o.user_id
  ),
  agg AS (
    SELECT uid, cnt, usd FROM eng
    UNION ALL
    SELECT uid, cnt, usd FROM nord
  ),
  totals AS (
    SELECT uid,
           SUM(cnt)::bigint AS cnt,
           SUM(usd)::numeric AS usd
    FROM agg
    GROUP BY uid
  )
  SELECT
    t.uid,
    COALESCE(p.email,'unknown')::text,
    COALESCE(p.full_name,'')::text,
    COALESCE(w.balance,0)::numeric,
    COALESCE(w.total_deposited,0)::numeric,
    COALESCE(w.total_spent,0)::numeric,
    t.cnt,
    ROUND(t.usd, 4)
  FROM totals t
  LEFT JOIN profiles p ON p.user_id = t.uid
  LEFT JOIN wallets w ON w.user_id = t.uid
  WHERE t.usd > 0
  ORDER BY t.usd DESC
  LIMIT GREATEST(1, p_limit);
END;
$$;
