CREATE FUNCTION public.credit_wallet_oxapay(p_order_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_dep record;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_credit_usd numeric;
  v_credit_inr numeric;
  v_tx_id uuid;
  v_lock_key bigint;
  v_rate numeric := 90;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN
    RAISE EXCEPTION 'order_id required';
  END IF;
  v_lock_key := abs(hashtextextended(p_order_id, 88));
  PERFORM pg_advisory_xact_lock(v_lock_key);
  SELECT * INTO v_dep FROM public.oxapay_deposits WHERE order_id = p_order_id FOR UPDATE;
  IF v_dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found: %', p_order_id;
  END IF;
  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
  END IF;
  IF lower(v_dep.status) NOT IN ('paid','confirmed','completed','success') THEN
    RETURN json_build_object('credited', false, 'reason', 'not_success', 'status', v_dep.status);
  END IF;
  -- Wallet balances/prices are stored internally as USD units and displayed as INR in the UI.
  -- Therefore ₹90 paid must credit 1.0000 wallet unit, which displays as ₹90.
  v_credit_inr := ROUND(v_dep.amount_inr::numeric, 2);
  v_credit_usd := ROUND((v_credit_inr / v_rate)::numeric, 4);
  IF v_credit_inr <= 0 OR v_credit_usd <= 0 THEN
    RAISE EXCEPTION 'invalid credit amount';
  END IF;
  -- Hard guard against currency mismatch: stored USD must match stored INR at the fixed platform rate.
  IF ABS(ROUND(v_dep.amount_usd::numeric, 4) - v_credit_usd) > 0.0112 THEN
    RAISE EXCEPTION 'currency mismatch for %: amount_usd %, amount_inr %', p_order_id, v_dep.amount_usd, v_dep.amount_inr;
  END IF;
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (v_dep.user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = v_dep.user_id FOR UPDATE;
  v_new_balance := ROUND(COALESCE(v_balance,0) + v_credit_usd, 4);
  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status, payment_method, payment_reference, description
  ) VALUES (
    v_dep.user_id, 'deposit', v_credit_usd, v_new_balance, 'completed', 'oxapay', p_order_id,
    'OxaPay crypto deposit (₹' || v_credit_inr || ' / $' || v_credit_usd ||
    COALESCE(' via ' || v_dep.pay_currency, '') || ')'
  ) RETURNING id INTO v_tx_id;
  UPDATE public.wallets
     SET balance = v_new_balance,
         total_deposited = ROUND(COALESCE(v_deposited,0) + v_credit_usd, 4),
         updated_at = now()
   WHERE user_id = v_dep.user_id;
  UPDATE public.oxapay_deposits
     SET credited = true, updated_at = now()
   WHERE order_id = p_order_id;
  RETURN json_build_object(
    'credited', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'credited_inr', v_credit_inr,
    'credited_usd', v_credit_usd
  );
END;
$_$;
CREATE FUNCTION public.credit_wallet_zapupi(p_order_id text, p_txn_id text DEFAULT NULL::text, p_utr text DEFAULT NULL::text, p_gateway_response jsonb DEFAULT NULL::jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lock_key bigint; v_dep record; v_balance numeric; v_deposited numeric;
  v_new_balance numeric; v_credit_usd numeric; v_rate numeric := 90; v_tx_id uuid;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN RAISE EXCEPTION 'order_id required'; END IF;
  v_lock_key := abs(hashtextextended(p_order_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);
  SELECT * INTO v_dep FROM public.zapupi_deposits WHERE order_id = p_order_id FOR UPDATE;
  IF v_dep.id IS NULL THEN RAISE EXCEPTION 'Deposit order not found'; END IF;
  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
  END IF;
  -- Use 6-decimal precision so INR/rate*rate rounds back to the exact paid amount
  -- (e.g. ₹50 -> 0.555556 USD -> ₹50.00 on display, not ₹49.99).
  v_credit_usd := ROUND(v_dep.amount_inr::numeric / v_rate, 6);
  IF v_credit_usd <= 0 THEN RAISE EXCEPTION 'invalid credit amount'; END IF;
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (v_dep.user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = v_dep.user_id FOR UPDATE;
  v_new_balance := ROUND(COALESCE(v_balance,0) + v_credit_usd, 6);
  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, payment_method, payment_reference, description)
  VALUES (v_dep.user_id, 'deposit', v_credit_usd, v_new_balance, 'completed', 'zapupi', p_order_id,
    'Wallet top-up via ZapUPI (₹' || trim(to_char(v_dep.amount_inr,'FM9999999990D00')) || ')')
  RETURNING id INTO v_tx_id;
  UPDATE public.wallets SET balance = v_new_balance,
    total_deposited = ROUND(COALESCE(v_deposited,0) + v_credit_usd, 6), updated_at = now()
   WHERE user_id = v_dep.user_id;
  UPDATE public.zapupi_deposits SET status = 'success', credited = true, amount_usd = v_credit_usd,
    txn_id = COALESCE(p_txn_id, txn_id), utr = COALESCE(p_utr, utr),
    gateway_response = COALESCE(p_gateway_response, gateway_response), updated_at = now()
   WHERE id = v_dep.id;
  RETURN json_build_object('credited', true, 'duplicate', false, 'transaction_id', v_tx_id,
    'new_balance', v_new_balance, 'credited_usd', v_credit_usd, 'credited_inr', v_dep.amount_inr);
END;
$$;
CREATE FUNCTION public.debit_wallet_for_order(p_user_id uuid, p_amount numeric, p_order_id uuid DEFAULT NULL::uuid, p_engagement_order_id uuid DEFAULT NULL::uuid, p_description text DEFAULT 'Order payment'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_balance numeric;
  v_spent numeric;
  v_new_balance numeric;
  v_amount numeric;
  v_tx_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than zero';
  END IF;
  IF p_order_id IS NULL AND p_engagement_order_id IS NULL THEN
    RAISE EXCEPTION 'either order_id or engagement_order_id required';
  END IF;
  v_amount := trunc(p_amount::numeric, 4);
  -- Lock the wallet row to serialize concurrent debits for the same user
  SELECT balance, total_spent INTO v_balance, v_spent
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF v_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  v_new_balance := trunc(v_balance - v_amount, 4);
  UPDATE public.wallets
     SET balance = v_new_balance,
         total_spent = trunc(COALESCE(v_spent, 0) + v_amount, 4),
         updated_at = now()
   WHERE user_id = p_user_id;
  -- Audit trail is MANDATORY and atomic with the debit (no logging gap possible)
  INSERT INTO public.transactions(
    user_id, type, amount, balance_after, order_id, description, status
  ) VALUES (
    p_user_id, 'order_payment', v_amount, v_new_balance, p_order_id, p_description, 'completed'
  )
  RETURNING id INTO v_tx_id;
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'debited', v_amount
  );
END;
$$;
CREATE FUNCTION public.enforce_deposit_provenance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN (
      'zapupi', 'oxapay', 'manual_admin', 'razorpay', 'usdt_bep20', 'razorpay_manual', 'legacy_admin'
    ) THEN
      RAISE EXCEPTION 'Forbidden: deposit requires a known payment_method (got: %).', COALESCE(NEW.payment_method, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.enforce_wallet_credit_trail() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_delta numeric;
  v_recent_count int;
BEGIN
  v_delta := COALESCE(NEW.balance,0) - COALESCE(OLD.balance,0);
  -- Only enforce on credits (increases). Decreases (debits/refunds) untouched.
  IF v_delta > 0.0001 THEN
    -- A matching transaction row must exist within last 5 seconds for this user
    SELECT COUNT(*) INTO v_recent_count
      FROM public.transactions
     WHERE user_id = NEW.user_id
       AND created_at > now() - interval '5 seconds'
       AND type IN ('deposit', 'refund')
       AND status = 'completed';
    IF v_recent_count = 0 THEN
      RAISE EXCEPTION 'Forbidden: wallet credit (+%) requires a matching transactions row.', v_delta;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.engagement_order_items_lock_user_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
CREATE FUNCTION public.engagement_order_items_tracking_recompute() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_start bigint;
  v_qty bigint;
  v_cur bigint;
  v_target bigint;
  v_delivered bigint;
  v_remaining bigint;
  v_progress numeric(5,2);
BEGIN
  v_start := COALESCE(NEW.start_count, 0);
  v_qty := COALESCE(NEW.quantity, 0);
  v_cur := COALESCE(NEW.current_count, v_start);
  IF NEW.max_observed_count IS NULL OR v_cur > NEW.max_observed_count THEN
    NEW.max_observed_count := v_cur;
  END IF;
  v_cur := COALESCE(NEW.max_observed_count, v_cur);
  NEW.current_count := v_cur;
  v_target := v_start + v_qty;
  NEW.target_count := v_target;
  v_delivered := GREATEST(0, v_cur - v_start);
  IF v_qty > 0 THEN
    v_delivered := LEAST(v_delivered, v_qty);
  END IF;
  NEW.delivered_count := v_delivered;
  v_remaining := GREATEST(0, v_target - v_cur);
  NEW.remaining_count := v_remaining;
  IF v_qty > 0 THEN
    v_progress := LEAST(100, ROUND((v_delivered::numeric / v_qty::numeric) * 100, 2));
  ELSE
    v_progress := 0;
  END IF;
  NEW.progress_percentage := v_progress;
  IF v_cur >= v_target AND v_qty > 0 AND NEW.completion_locked_at IS NULL THEN
    NEW.completion_locked_at := now();
  END IF;
  -- Strict completion gate ONLY when we have a real public baseline to check against.
  -- start_count = 0 means the provider does not expose a public counter for this
  -- service type, so completion is decided by run-level delivery outcomes.
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.start_count IS NOT NULL
     AND NEW.start_count > 0
     AND v_qty > 0
     AND NEW.completion_locked_at IS NULL THEN
    NEW.status := 'processing';
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.engagement_orders_lock_user_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
CREATE FUNCTION public.export_auth_users() RETURNS TABLE(id uuid, email text, encrypted_password text, email_confirmed_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, last_sign_in_at timestamp with time zone, raw_user_meta_data jsonb, raw_app_meta_data jsonb, phone text, is_super_admin boolean, role text, aud text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT u.id, u.email::text, u.encrypted_password::text, u.email_confirmed_at,
         u.created_at, u.updated_at, u.last_sign_in_at,
         u.raw_user_meta_data, u.raw_app_meta_data, u.phone::text,
         u.is_super_admin, u.role::text, u.aud::text
  FROM auth.users u
  ORDER BY u.created_at;
$$;
CREATE FUNCTION public.export_auth_users_for_backup(p_limit integer DEFAULT 500, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, email text, encrypted_password text, phone text, email_confirmed_at timestamp with time zone, raw_user_meta_data jsonb, raw_app_meta_data jsonb, created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT u.id, u.email::text, u.encrypted_password::text, u.phone::text,
         u.email_confirmed_at, u.raw_user_meta_data, u.raw_app_meta_data,
         u.created_at, u.last_sign_in_at
  FROM auth.users u
  ORDER BY u.created_at, u.id
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;
CREATE FUNCTION public.get_admin_dashboard_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;
CREATE FUNCTION public.get_admin_users_summary() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
      COALESCE(p.is_banned, false) AS is_banned,
      p.banned_at,
      p.banned_reason,
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
CREATE FUNCTION public.get_due_engagement_run_ids(p_limit integer DEFAULT 250) RETURNS TABLE(id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
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
CREATE FUNCTION public.get_or_create_bot_user(_telegram_id text, _full_name text DEFAULT ''::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _profile_id UUID;
  _new_profile_id UUID;
BEGIN
  -- Check if profile exists
  SELECT id INTO _profile_id FROM public.profiles WHERE telegram_id = _telegram_id;
  IF _profile_id IS NOT NULL THEN
    RETURN _profile_id;
  END IF;
  -- Create new shadow profile
  INSERT INTO public.profiles (email, full_name, telegram_id)
  VALUES (_telegram_id || '@telegram.bot', _full_name, _telegram_id)
  RETURNING id INTO _new_profile_id;
  -- Create wallet for this shadow profile
  -- We use the profile ID instead of user_id for shadow wallets? 
  -- Wait, wallets table also references auth.users(user_id).
  -- Let's fix wallets table too.
  RETURN _new_profile_id;
END;
$$;
CREATE FUNCTION public.get_provider_topup_breakdown() RETURNS TABLE(provider_id text, provider_name text, service_id uuid, service_name text, service_category text, pending_runs bigint, pending_quantity bigint, pending_user_usd numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;
CREATE FUNCTION public.get_provider_topup_plan() RETURNS TABLE(provider_id text, provider_name text, pending_runs bigint, pending_user_usd numeric, markup_percent numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;
CREATE FUNCTION public.get_public_markup() RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE((SELECT global_markup_percent FROM public.platform_settings LIMIT 1), 0)::numeric
$$;
