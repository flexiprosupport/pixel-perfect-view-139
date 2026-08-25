
CREATE OR REPLACE FUNCTION public.get_provider_topup_plan()
 RETURNS TABLE(provider_id text, provider_name text, pending_runs bigint, pending_user_usd numeric, markup_percent numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH service_map AS (
    -- for each service, list active mapped providers (via provider_accounts)
    SELECT spm.service_id, pa.provider_id AS pid,
           COUNT(*) OVER (PARTITION BY spm.service_id) AS n
    FROM service_provider_mapping spm
    JOIN provider_accounts pa ON pa.id = spm.provider_account_id
    WHERE spm.is_active = true AND pa.is_active = true
  ),
  eng AS (
    SELECT COALESCE(sm.pid, s.provider_id) AS pid,
           1.0 / NULLIF(COALESCE(sm.n, 1), 0) AS share,
           rs.quantity_to_send AS qty,
           s.price AS price
    FROM organic_run_schedule rs
    JOIN engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN services s ON s.id = eoi.service_id
    LEFT JOIN service_map sm ON sm.service_id = s.id
    WHERE rs.status = 'pending'
  ),
  eng_agg AS (
    SELECT pid,
           SUM(share)::bigint AS runs,
           SUM((qty::numeric / 1000.0) * price * share) AS usd
    FROM eng GROUP BY pid
  ),
  nrun AS (
    SELECT COALESCE(sm.pid, s.provider_id) AS pid,
           1.0 / NULLIF(COALESCE(sm.n, 1), 0) AS share,
           rs.quantity_to_send AS qty,
           (o.price / NULLIF(o.quantity,0) * 1000) AS price
    FROM organic_run_schedule rs
    JOIN orders o ON o.id = rs.order_id
    LEFT JOIN services s ON s.id = o.service_id
    LEFT JOIN service_map sm ON sm.service_id = s.id
    WHERE rs.status = 'pending'
  ),
  nrun_agg AS (
    SELECT pid,
           SUM(share)::bigint AS runs,
           SUM((qty::numeric / 1000.0) * price * share) AS usd
    FROM nrun GROUP BY pid
  ),
  ord AS (
    SELECT COALESCE(sm.pid, s.provider_id) AS pid,
           1.0 / NULLIF(COALESCE(sm.n, 1), 0) AS share,
           o.price AS price
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    LEFT JOIN service_map sm ON sm.service_id = s.id
    WHERE o.status IN ('pending','processing')
      AND NOT EXISTS (SELECT 1 FROM organic_run_schedule rs WHERE rs.order_id = o.id)
  ),
  ord_agg AS (
    SELECT pid, SUM(share)::bigint AS runs, SUM(price * share) AS usd FROM ord GROUP BY pid
  ),
  agg AS (
    SELECT pid, runs, usd FROM eng_agg
    UNION ALL SELECT pid, runs, usd FROM nrun_agg
    UNION ALL SELECT pid, runs, usd FROM ord_agg
  )
  SELECT
    COALESCE(a.pid, 'unknown')::text,
    COALESCE(p.name, a.pid, 'unknown')::text,
    SUM(a.runs)::bigint,
    ROUND(COALESCE(SUM(a.usd), 0)::numeric, 4),
    COALESCE((SELECT global_markup_percent FROM platform_settings LIMIT 1), 0)::numeric
  FROM agg a
  LEFT JOIN providers p ON p.id = a.pid
  GROUP BY a.pid, p.name
  HAVING SUM(a.runs) > 0
  ORDER BY 4 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_provider_topup_breakdown()
 RETURNS TABLE(provider_id text, provider_name text, service_id uuid, service_name text, service_category text, pending_runs bigint, pending_quantity bigint, pending_user_usd numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH service_map AS (
    SELECT spm.service_id, pa.provider_id AS pid,
           COUNT(*) OVER (PARTITION BY spm.service_id) AS n
    FROM service_provider_mapping spm
    JOIN provider_accounts pa ON pa.id = spm.provider_account_id
    WHERE spm.is_active = true AND pa.is_active = true
  ),
  eng AS (
    SELECT COALESCE(sm.pid, s.provider_id) AS pid,
           s.id AS sid, s.name AS sname, s.category AS scat,
           1.0 / NULLIF(COALESCE(sm.n,1),0) AS share,
           rs.quantity_to_send AS qty,
           s.price AS price
    FROM organic_run_schedule rs
    JOIN engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN services s ON s.id = eoi.service_id
    LEFT JOIN service_map sm ON sm.service_id = s.id
    WHERE rs.status = 'pending'
  ),
  eng_agg AS (
    SELECT pid, sid, sname, scat,
           SUM(share)::bigint AS runs,
           SUM(qty * share)::bigint AS qty,
           SUM((qty::numeric/1000.0) * price * share) AS usd
    FROM eng GROUP BY pid, sid, sname, scat
  ),
  nrun AS (
    SELECT COALESCE(sm.pid, s.provider_id) AS pid,
           s.id AS sid, s.name AS sname, s.category AS scat,
           1.0 / NULLIF(COALESCE(sm.n,1),0) AS share,
           rs.quantity_to_send AS qty,
           (o.price / NULLIF(o.quantity,0) * 1000) AS price
    FROM organic_run_schedule rs
    JOIN orders o ON o.id = rs.order_id
    LEFT JOIN services s ON s.id = o.service_id
    LEFT JOIN service_map sm ON sm.service_id = s.id
    WHERE rs.status = 'pending'
  ),
  nrun_agg AS (
    SELECT pid, sid, sname, scat,
           SUM(share)::bigint AS runs,
           SUM(qty * share)::bigint AS qty,
           SUM((qty::numeric/1000.0) * price * share) AS usd
    FROM nrun GROUP BY pid, sid, sname, scat
  ),
  ord AS (
    SELECT COALESCE(sm.pid, s.provider_id) AS pid,
           s.id AS sid, s.name AS sname, s.category AS scat,
           1.0 / NULLIF(COALESCE(sm.n,1),0) AS share,
           o.quantity AS qty,
           o.price AS price
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    LEFT JOIN service_map sm ON sm.service_id = s.id
    WHERE o.status IN ('pending','processing')
      AND NOT EXISTS (SELECT 1 FROM organic_run_schedule rs WHERE rs.order_id = o.id)
  ),
  ord_agg AS (
    SELECT pid, sid, sname, scat,
           SUM(share)::bigint AS runs,
           SUM(qty * share)::bigint AS qty,
           SUM(price * share) AS usd
    FROM ord GROUP BY pid, sid, sname, scat
  ),
  agg AS (
    SELECT * FROM eng_agg
    UNION ALL SELECT * FROM nrun_agg
    UNION ALL SELECT * FROM ord_agg
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
$function$;
