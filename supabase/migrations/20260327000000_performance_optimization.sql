-- Performance Optimization Migration
-- Target: Fix "Unhealthy" status by adding indexes and optimized RPCs

-- 1. Add missing indexes for performance on large tables
CREATE INDEX IF NOT EXISTS idx_orders_status_user_id ON public.orders(status, user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_orders_status_user_id ON public.engagement_orders(status, user_id);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_order_id_status ON public.organic_run_schedule(order_id, status);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_engagement_item_id_status ON public.organic_run_schedule(engagement_order_item_id, status);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_scheduled_at ON public.organic_run_schedule(scheduled_at);

-- 2. Optimized RPC for admin dashboard stats (replaces multiple client-side scans)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_count', (SELECT count(*) FROM public.profiles),
    'service_count', (SELECT count(*) FROM public.services WHERE is_active = true),
    'total_revenue', (
      COALESCE((SELECT sum(price) FROM public.orders), 0) + 
      COALESCE((SELECT sum(total_price) FROM public.engagement_orders), 0)
    ),
    'total_orders', (
      (SELECT count(*) FROM public.orders) + 
      (SELECT count(*) FROM public.engagement_orders)
    ),
    'markup', (SELECT global_markup_percent FROM public.platform_settings WHERE id = 'global' LIMIT 1),
    'maintenance_mode', (SELECT maintenance_mode FROM public.platform_settings WHERE id = 'global' LIMIT 1)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 3. Optimized RPC for admin users summary (Fixes N+1 problem in AdminUsers.tsx)
CREATE OR REPLACE FUNCTION public.get_admin_users_summary()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  balance NUMERIC,
  total_deposited NUMERIC,
  total_spent NUMERIC,
  role TEXT,
  subscription_status TEXT,
  subscription_plan TEXT,
  subscription_expires TIMESTAMPTZ,
  active_single_orders BIGINT,
  active_engagement_orders BIGINT,
  paused_single_orders BIGINT,
  paused_engagement_orders BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.created_at,
    COALESCE(w.balance, 0),
    COALESCE(w.total_deposited, 0),
    COALESCE(w.total_spent, 0),
    COALESCE(ur.role::text, 'user'),
    COALESCE(s.status, 'inactive'),
    COALESCE(s.plan_type, 'none'),
    s.expires_at,
    (SELECT count(*) FROM public.orders o WHERE o.user_id = p.user_id AND o.status IN ('pending', 'processing')),
    (SELECT count(*) FROM public.engagement_orders eo WHERE eo.user_id = p.user_id AND eo.status IN ('pending', 'processing')),
    (SELECT count(*) FROM public.orders o WHERE o.user_id = p.user_id AND o.status = 'paused'),
    (SELECT count(*) FROM public.engagement_orders eo WHERE eo.user_id = p.user_id AND eo.status = 'paused')
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
  ORDER BY p.created_at DESC;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_summary() TO authenticated;

COMMENT ON FUNCTION public.get_admin_dashboard_stats() IS 'Returns performance-optimized stats for the admin dashboard hero section';
COMMENT ON FUNCTION public.get_admin_users_summary() IS 'Returns performance-optimized user summary data, fixing N+1 query issues';
