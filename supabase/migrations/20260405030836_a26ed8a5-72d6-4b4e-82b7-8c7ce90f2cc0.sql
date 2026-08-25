
-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_organic_mode_default BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organic_ratios JSONB;

-- Admin dashboard stats function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total_revenue', COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'order_payment' AND status = 'completed'), 0),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'user_count', (SELECT COUNT(*) FROM profiles),
    'service_count', (SELECT COUNT(*) FROM services WHERE is_active = true),
    'markup', COALESCE((SELECT global_markup_percent FROM platform_settings LIMIT 1), 0),
    'maintenance_mode', COALESCE((SELECT maintenance_mode FROM platform_settings LIMIT 1), false)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Admin users summary function
CREATE OR REPLACE FUNCTION public.get_admin_users_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      p.id,
      p.user_id,
      p.email,
      p.full_name,
      p.created_at,
      COALESCE(w.balance, 0) as balance,
      COALESCE(w.total_deposited, 0) as total_deposited,
      COALESCE(w.total_spent, 0) as total_spent,
      COALESCE(ur.role::text, 'user') as role,
      COALESCE(s.plan_type, 'none') as plan_type,
      COALESCE(s.status, 'inactive') as subscription_status
    FROM profiles p
    LEFT JOIN wallets w ON w.user_id = p.user_id
    LEFT JOIN user_roles ur ON ur.user_id = p.user_id
    LEFT JOIN subscriptions s ON s.user_id = p.user_id
    ORDER BY p.created_at DESC
  ) t;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated;
