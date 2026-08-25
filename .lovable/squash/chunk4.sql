CREATE FUNCTION public.get_top_pending_users(p_limit integer DEFAULT 5) RETURNS TABLE(user_id uuid, email text, full_name text, wallet_balance numeric, total_deposited numeric, total_spent numeric, pending_orders bigint, pending_value_usd numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;
CREATE FUNCTION public.guard_oxapay_deposit_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow service_role unconditionally
  IF v_role = 'service_role' OR current_user IN ('postgres','supabase_admin','service_role') THEN
    RETURN NEW;
  END IF;
  -- Non-service callers cannot flip credited=true or move status to a paid state
  IF NEW.credited IS DISTINCT FROM OLD.credited AND NEW.credited = true THEN
    RAISE EXCEPTION 'Forbidden: only backend can mark oxapay deposit credited';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND lower(NEW.status) IN ('paid','confirmed','completed','success') THEN
    RAISE EXCEPTION 'Forbidden: only backend can promote oxapay deposit status to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::app_role
  );
$$;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
CREATE FUNCTION public.is_maintenance_mode() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE((SELECT maintenance_mode FROM public.platform_settings LIMIT 1), false)
$$;
CREATE FUNCTION public.is_user_banned(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE user_id = _user_id), false)
$$;
CREATE FUNCTION public.orders_tracking_recompute() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_start BIGINT;
  v_qty   BIGINT;
  v_cur   BIGINT;
  v_target BIGINT;
  v_delivered BIGINT;
  v_remaining BIGINT;
  v_progress NUMERIC(5,2);
BEGIN
  v_start := COALESCE(NEW.start_count, 0);
  v_qty   := COALESCE(NEW.quantity, 0);
  v_cur   := COALESCE(NEW.current_count, v_start);
  IF NEW.max_observed_count IS NULL OR v_cur > NEW.max_observed_count THEN
    NEW.max_observed_count := v_cur;
  END IF;
  v_cur := NEW.max_observed_count;
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
  -- Only enforce completion gate when we have a real public baseline.
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
CREATE FUNCTION public.organic_run_schedule_lock_user_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_bypass text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    v_bypass := current_setting('app.allow_run_edit', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := NULL;
  END;
  IF v_bypass = '1' THEN
    RETURN NEW;
  END IF;
  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;
  -- Regular user: revert all provider/internal columns
  NEW.order_id                 := OLD.order_id;
  NEW.engagement_order_item_id := OLD.engagement_order_item_id;
  NEW.run_number               := OLD.run_number;
  NEW.peak_multiplier          := OLD.peak_multiplier;
  NEW.provider_order_id        := OLD.provider_order_id;
  NEW.provider_response        := OLD.provider_response;
  NEW.error_message            := OLD.error_message;
  NEW.started_at               := OLD.started_at;
  NEW.completed_at             := OLD.completed_at;
  NEW.provider_start_count     := OLD.provider_start_count;
  NEW.provider_remains         := OLD.provider_remains;
  NEW.provider_status          := OLD.provider_status;
  NEW.provider_charge          := OLD.provider_charge;
  NEW.last_status_check        := OLD.last_status_check;
  NEW.retry_count              := OLD.retry_count;
  NEW.provider_account_id      := OLD.provider_account_id;
  NEW.provider_account_name    := OLD.provider_account_name;
  NEW.created_at               := OLD.created_at;
  -- Lock sensitive scheduling/quantity fields — must go through reschedule RPC
  NEW.scheduled_at     := OLD.scheduled_at;
  NEW.quantity_to_send := OLD.quantity_to_send;
  NEW.base_quantity    := OLD.base_quantity;
  NEW.variance_applied := OLD.variance_applied;
  -- Status: only allow change to 'cancelled'
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.pg_advisory_xact_lock(key bigint) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT pg_catalog.pg_advisory_xact_lock(key);
$$;
CREATE FUNCTION public.profiles_lock_user_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid, 'admin'::app_role) THEN RETURN NEW; END IF;
  -- Non-admin: revert admin-controlled / immutable fields
  NEW.user_id       := OLD.user_id;
  NEW.email         := OLD.email;
  NEW.api_key       := OLD.api_key;
  NEW.is_banned     := OLD.is_banned;
  NEW.banned_at     := OLD.banned_at;
  NEW.banned_reason := OLD.banned_reason;
  NEW.created_at    := OLD.created_at;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.reschedule_organic_run(p_run_id uuid, p_quantity integer, p_scheduled_at timestamp with time zone) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run record;
  v_order_price numeric;
  v_order_quantity integer;
  v_price_per_thousand numeric := 0;
  v_qty_diff integer;
  v_extra_cost numeric := 0;
  v_balance numeric;
  v_spent numeric;
  v_new_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000000 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;
  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Scheduled time required';
  END IF;
  SELECT
    rs.id,
    rs.order_id,
    rs.engagement_order_item_id,
    rs.run_number,
    rs.status,
    rs.quantity_to_send,
    rs.base_quantity,
    o.user_id AS order_user_id,
    o.price AS order_price,
    o.quantity AS order_quantity,
    eo.user_id AS engagement_order_user_id,
    s.price AS service_price
  INTO v_run
  FROM public.organic_run_schedule rs
  LEFT JOIN public.orders o
    ON o.id = rs.order_id
  LEFT JOIN public.engagement_order_items eoi
    ON eoi.id = rs.engagement_order_item_id
  LEFT JOIN public.engagement_orders eo
    ON eo.id = eoi.engagement_order_id
  LEFT JOIN public.services s
    ON s.id = eoi.service_id
  WHERE rs.id = p_run_id
    AND (
      o.user_id = v_uid
      OR eo.user_id = v_uid
    )
  FOR UPDATE OF rs;
  IF v_run IS NULL THEN
    RAISE EXCEPTION 'Run not found or not owned by you';
  END IF;
  IF v_run.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending runs can be rescheduled';
  END IF;
  IF v_run.order_id IS NOT NULL THEN
    v_order_price := COALESCE(v_run.order_price, 0);
    v_order_quantity := COALESCE(v_run.order_quantity, 0);
    IF v_order_quantity > 0 THEN
      v_price_per_thousand := (v_order_price::numeric / v_order_quantity::numeric) * 1000;
    END IF;
  ELSIF v_run.engagement_order_item_id IS NOT NULL THEN
    v_price_per_thousand := COALESCE(v_run.service_price, 0);
  END IF;
  v_qty_diff := p_quantity - v_run.quantity_to_send;
  IF v_qty_diff > 0 AND v_price_per_thousand > 0 THEN
    v_extra_cost := trunc((v_qty_diff::numeric / 1000.0) * v_price_per_thousand, 4);
  END IF;
  IF v_extra_cost > 0 THEN
    SELECT balance, total_spent
      INTO v_balance, v_spent
    FROM public.wallets
    WHERE user_id = v_uid
    FOR UPDATE;
    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet not found';
    END IF;
    IF v_balance < v_extra_cost THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    v_new_balance := trunc(v_balance - v_extra_cost, 4);
    UPDATE public.wallets
       SET balance = v_new_balance,
           total_spent = trunc(COALESCE(v_spent, 0) + v_extra_cost, 4)
     WHERE user_id = v_uid;
    INSERT INTO public.transactions (
      user_id,
      type,
      amount,
      balance_after,
      status,
      payment_method,
      order_id,
      description
    )
    VALUES (
      v_uid,
      'order',
      -v_extra_cost,
      v_new_balance,
      'completed',
      'wallet',
      v_run.order_id,
      'Reschedule run #' || COALESCE(v_run.run_number::text, '?') || ' (+' || v_qty_diff || ' units)'
    );
  END IF;
  PERFORM set_config('app.allow_run_edit', '1', true);
  UPDATE public.organic_run_schedule
     SET quantity_to_send = p_quantity,
         base_quantity = p_quantity,
         scheduled_at = p_scheduled_at,
         variance_applied = 0
   WHERE id = p_run_id
     AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run could not be updated';
  END IF;
  PERFORM set_config('app.allow_run_edit', '0', true);
  RETURN json_build_object(
    'success', true,
    'extra_charged', v_extra_cost,
    'new_balance', COALESCE(v_new_balance, v_balance, NULL),
    'quantity', p_quantity,
    'scheduled_at', p_scheduled_at
  );
END;
$$;
CREATE FUNCTION public.set_engagement_order_completed_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('completed','cancelled','failed','partial')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF NEW.status NOT IN ('completed','cancelled','failed','partial') THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_conversation_last_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_new_chat_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();
CREATE TRIGGER popup_ads_updated_at BEFORE UPDATE ON public.popup_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_engagement_order_completed_at_trigger BEFORE UPDATE ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION public.set_engagement_order_completed_at();
CREATE TRIGGER trg_cancel_runs_on_eo_cancel AFTER UPDATE OF status ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION public.cancel_pending_runs_on_eo_cancel();
CREATE TRIGGER trg_cancel_runs_on_item_status AFTER UPDATE OF status ON public.engagement_order_items FOR EACH ROW EXECUTE FUNCTION public.cancel_pending_runs_on_item_cancel();
CREATE TRIGGER trg_chat_conversations_lock_user_columns BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.chat_conversations_lock_user_columns();
CREATE TRIGGER trg_compute_rotation_lock_key BEFORE INSERT OR UPDATE OF status, provider_order_id, provider_account_id, engagement_order_item_id ON public.organic_run_schedule FOR EACH ROW EXECUTE FUNCTION public.compute_rotation_lock_key();
CREATE TRIGGER trg_enforce_deposit_provenance BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.enforce_deposit_provenance();
CREATE TRIGGER trg_enforce_wallet_credit_trail BEFORE UPDATE OF balance ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_credit_trail();
CREATE TRIGGER trg_engagement_order_items_lock_user_cols BEFORE UPDATE ON public.engagement_order_items FOR EACH ROW EXECUTE FUNCTION public.engagement_order_items_lock_user_columns();
CREATE TRIGGER trg_engagement_order_items_lock_user_columns BEFORE UPDATE ON public.engagement_order_items FOR EACH ROW EXECUTE FUNCTION public.engagement_order_items_lock_user_columns();
CREATE TRIGGER trg_engagement_order_items_tracking_recompute BEFORE INSERT OR UPDATE OF start_count, current_count, quantity, status, max_observed_count ON public.engagement_order_items FOR EACH ROW EXECUTE FUNCTION public.engagement_order_items_tracking_recompute();
CREATE TRIGGER trg_engagement_orders_lock_user_cols BEFORE UPDATE ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION public.engagement_orders_lock_user_columns();
CREATE TRIGGER trg_engagement_orders_lock_user_columns BEFORE UPDATE ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION public.engagement_orders_lock_user_columns();
CREATE TRIGGER trg_guard_oxapay_deposit_change BEFORE UPDATE ON public.oxapay_deposits FOR EACH ROW EXECUTE FUNCTION public.guard_oxapay_deposit_change();
CREATE TRIGGER trg_orders_tracking_recompute BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_tracking_recompute();
CREATE TRIGGER trg_organic_run_schedule_lock_user_columns BEFORE UPDATE ON public.organic_run_schedule FOR EACH ROW EXECUTE FUNCTION public.organic_run_schedule_lock_user_columns();
CREATE TRIGGER trg_oxapay_deposits_updated BEFORE UPDATE ON public.oxapay_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_lock_user_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_lock_user_columns();
CREATE TRIGGER trg_zapupi_deposits_updated BEFORE UPDATE ON public.zapupi_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_bundles_updated_at BEFORE UPDATE ON public.engagement_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_order_items_updated_at BEFORE UPDATE ON public.engagement_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_orders_updated_at BEFORE UPDATE ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provider_accounts_updated_at BEFORE UPDATE ON public.provider_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscription_requests_updated_at BEFORE UPDATE ON public.subscription_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admin can manage all bundle items" ON public.bundle_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin can manage all bundles" ON public.engagement_bundles USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin can manage all services" ON public.services USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin only provider_accounts" ON public.provider_accounts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin only providers" ON public.providers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin only service provider mapping" ON public.service_provider_mapping USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin only service_provider_mapping" ON public.service_provider_mapping TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can create messages" ON public.chat_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Admins can manage all engagement_orders" ON public.engagement_orders TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can manage all order items" ON public.engagement_order_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage all orders" ON public.orders TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can manage all runs" ON public.organic_run_schedule TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can manage all transactions" ON public.transactions TO authenticated USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can manage all wallets" ON public.wallets TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can manage requests" ON public.subscription_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage subscription requests" ON public.subscription_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can read rotation alerts" ON public.rotation_alert_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can update messages" ON public.chat_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view all messages" ON public.chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins manage deposits" ON public.deposits TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins manage engagement_orders" ON public.engagement_orders TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage order items" ON public.engagement_order_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins manage orders" ON public.orders TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage platform settings" ON public.platform_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins manage requests" ON public.subscription_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage runs" ON public.organic_run_schedule TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage tickets" ON public.support_tickets TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read oxapay events" ON public.oxapay_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins read platform settings" ON public.platform_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update messages" ON public.chat_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Anyone can view active bundles" ON public.engagement_bundles FOR SELECT USING ((is_active = true));
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING ((is_active = true));
CREATE POLICY "Anyone can view bundle items of active bundles" ON public.bundle_items FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.engagement_bundles eb
  WHERE ((eb.id = bundle_items.bundle_id) AND (eb.is_active = true)))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Deny anonymous access to chat_conversations" ON public.chat_conversations AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to chat_messages" ON public.chat_messages AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to engagement_order_items" ON public.engagement_order_items AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to engagement_orders" ON public.engagement_orders AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to orders" ON public.orders AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to organic_run_schedule" ON public.organic_run_schedule AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to profiles" ON public.profiles AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to subscription_requests" ON public.subscription_requests AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to subscriptions" ON public.subscriptions AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to support_tickets" ON public.support_tickets AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Deny anonymous access to transactions" ON public.transactions AS RESTRICTIVE FOR SELECT USING ((auth.uid() IS NOT NULL));
