
-- ============================================================
-- FORT KNOX LOCKDOWN: orders/engagement_orders/wallets/transactions
-- Defense in depth — even if RLS had a hole, grants block it
-- ============================================================

-- 1) WALLETS: only SELECT for users (no INSERT/UPDATE/DELETE via PostgREST)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallets FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

-- 2) TRANSACTIONS: only SELECT for users
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transactions FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

-- 3) ORDERS: only SELECT for users (admin uses service-role from edge functions)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.orders FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- 4) USER_ROLES: SELECT only — no role self-elevation possible
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 5) ENGAGEMENT_ORDERS: keep UPDATE so users can pause/cancel via app,
--    but lock financial columns with a trigger
REVOKE INSERT, DELETE, TRUNCATE ON public.engagement_orders FROM anon, authenticated, PUBLIC;
GRANT SELECT, UPDATE ON public.engagement_orders TO authenticated;
GRANT ALL ON public.engagement_orders TO service_role;

CREATE OR REPLACE FUNCTION public.engagement_orders_lock_user_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  IF v_is_admin THEN RETURN NEW; END IF;

  -- Regular user: lock EVERY financial / ownership / metadata field
  NEW.user_id        := OLD.user_id;
  NEW.bundle_id      := OLD.bundle_id;
  NEW.link           := OLD.link;
  NEW.total_price    := OLD.total_price;
  NEW.base_quantity  := OLD.base_quantity;
  NEW.is_organic_mode:= OLD.is_organic_mode;
  NEW.order_number   := OLD.order_number;
  NEW.created_at     := OLD.created_at;
  NEW.completed_at   := OLD.completed_at;

  -- Status: only allow paused/processing/cancelled (extra belt-and-braces with the RLS WITH CHECK)
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('paused','processing','cancelled') THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_engagement_orders_lock_user_cols ON public.engagement_orders;
CREATE TRIGGER trg_engagement_orders_lock_user_cols
  BEFORE UPDATE ON public.engagement_orders
  FOR EACH ROW EXECUTE FUNCTION public.engagement_orders_lock_user_columns();

-- 6) ENGAGEMENT_ORDER_ITEMS: same treatment
REVOKE INSERT, DELETE, TRUNCATE ON public.engagement_order_items FROM anon, authenticated, PUBLIC;
GRANT SELECT, UPDATE ON public.engagement_order_items TO authenticated;
GRANT ALL ON public.engagement_order_items TO service_role;

CREATE OR REPLACE FUNCTION public.engagement_order_items_lock_user_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  IF v_is_admin THEN RETURN NEW; END IF;

  NEW.engagement_order_id := OLD.engagement_order_id;
  NEW.engagement_type     := OLD.engagement_type;
  NEW.service_id          := OLD.service_id;
  NEW.quantity            := OLD.quantity;
  NEW.price               := OLD.price;
  NEW.created_at          := OLD.created_at;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('paused','processing','cancelled') THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_engagement_order_items_lock_user_cols ON public.engagement_order_items;
CREATE TRIGGER trg_engagement_order_items_lock_user_cols
  BEFORE UPDATE ON public.engagement_order_items
  FOR EACH ROW EXECUTE FUNCTION public.engagement_order_items_lock_user_columns();

-- 7) ORGANIC_RUN_SCHEDULE: revoke INSERT/DELETE at grant level (lock trigger already exists)
REVOKE INSERT, DELETE, TRUNCATE ON public.organic_run_schedule FROM anon, authenticated, PUBLIC;
GRANT SELECT, UPDATE ON public.organic_run_schedule TO authenticated;
GRANT ALL ON public.organic_run_schedule TO service_role;

-- 8) DEPOSITS / ZAPUPI_DEPOSITS: only SELECT for users (admin/service-role manages writes)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.deposits FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.zapupi_deposits FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.zapupi_deposits TO authenticated;
GRANT ALL ON public.zapupi_deposits TO service_role;

-- 9) Add anomaly-detection view (admins can query to catch any future bypass attempts)
CREATE OR REPLACE VIEW public.v_orders_missing_debit AS
WITH all_orders AS (
  SELECT id, user_id, price AS amt, created_at, 'order' AS kind, order_number FROM public.orders WHERE status <> 'cancelled'
  UNION ALL
  SELECT id, user_id, total_price, created_at, 'engagement', order_number FROM public.engagement_orders WHERE status <> 'cancelled'
)
SELECT o.id, o.user_id, o.kind, o.order_number, o.amt, o.created_at
FROM all_orders o
WHERE o.created_at > '2026-06-20'
  AND NOT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.user_id = o.user_id
      AND t.type IN ('order_payment','order')
      AND t.created_at BETWEEN o.created_at - interval '5 min' AND o.created_at + interval '5 min'
      AND ABS(ABS(t.amount) - o.amt) < 0.01
  );

REVOKE ALL ON public.v_orders_missing_debit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_orders_missing_debit TO service_role;
