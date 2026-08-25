CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_revenue', COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE type IN ('order', 'order_payment') AND status = 'completed'), 0),
    'total_deposits', COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'deposit' AND status = 'completed'), 0),
    'total_wallet_balance', COALESCE((SELECT SUM(balance) FROM wallets), 0),
    'deposits_today', COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'deposit' AND status = 'completed' AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')), 0),
    'deposits_count', COALESCE((SELECT COUNT(*) FROM transactions WHERE type = 'deposit' AND status = 'completed'), 0),
    'total_orders', (SELECT COUNT(*) FROM orders) + (SELECT COUNT(*) FROM engagement_orders),
    'user_count', (SELECT COUNT(*) FROM profiles),
    'service_count', (SELECT COUNT(*) FROM services WHERE is_active = true),
    'markup', COALESCE((SELECT global_markup_percent FROM platform_settings LIMIT 1), 0),
    'maintenance_mode', COALESCE((SELECT maintenance_mode FROM platform_settings LIMIT 1), false)
  ) INTO result;

  RETURN result;
END;
$function$;