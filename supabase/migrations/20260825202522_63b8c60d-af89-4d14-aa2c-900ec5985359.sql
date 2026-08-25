CREATE INDEX idx_engagement_orders_user ON public.engagement_orders USING btree (user_id);
CREATE INDEX idx_engagement_orders_user_id_created ON public.engagement_orders USING btree (user_id, created_at DESC);
CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);
CREATE INDEX idx_orders_is_organic ON public.orders USING btree (is_organic_mode) WHERE (is_organic_mode = true);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_status_user_id ON public.orders USING btree (status, user_id);
CREATE INDEX idx_orders_sync_watch ON public.orders USING btree (status, last_synced_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX idx_orders_user_id_created ON public.orders USING btree (user_id, created_at DESC);
CREATE INDEX idx_orders_user_status ON public.orders USING btree (user_id, status);
CREATE INDEX idx_org_runs_provider_started ON public.organic_run_schedule USING btree (provider_account_id, started_at DESC) WHERE (provider_order_id IS NOT NULL);
CREATE INDEX idx_organic_run_schedule_engagement_item_id_status ON public.organic_run_schedule USING btree (engagement_order_item_id, status);
CREATE INDEX idx_organic_run_schedule_item_id ON public.organic_run_schedule USING btree (engagement_order_item_id) WHERE (engagement_order_item_id IS NOT NULL);
CREATE INDEX idx_organic_run_schedule_order_id_status ON public.organic_run_schedule USING btree (order_id, status);
CREATE INDEX idx_organic_run_schedule_scheduled_at ON public.organic_run_schedule USING btree (scheduled_at);
CREATE INDEX idx_organic_run_schedule_status_check ON public.organic_run_schedule USING btree (status, last_status_check);
CREATE INDEX idx_organic_run_schedule_status_failed ON public.organic_run_schedule USING btree (status, retry_count) WHERE (status = 'failed'::text);
CREATE INDEX idx_organic_runs_engagement_item ON public.organic_run_schedule USING btree (engagement_order_item_id);
CREATE INDEX idx_organic_runs_order_id ON public.organic_run_schedule USING btree (order_id);
CREATE INDEX idx_organic_runs_order_status ON public.organic_run_schedule USING btree (order_id, status);
CREATE INDEX idx_organic_runs_started ON public.organic_run_schedule USING btree (status) WHERE (status = 'started'::text);
CREATE INDEX idx_organic_runs_status_scheduled ON public.organic_run_schedule USING btree (status, scheduled_at) WHERE (status = 'pending'::text);
CREATE INDEX idx_oxapay_deposits_status ON public.oxapay_deposits USING btree (status);
CREATE INDEX idx_oxapay_deposits_track ON public.oxapay_deposits USING btree (track_id);
CREATE INDEX idx_oxapay_deposits_user ON public.oxapay_deposits USING btree (user_id);
CREATE INDEX idx_oxapay_events_order ON public.oxapay_webhook_events USING btree (order_id);
CREATE INDEX idx_oxapay_events_received ON public.oxapay_webhook_events USING btree (received_at DESC);
CREATE INDEX idx_oxapay_wh_received_at ON public.oxapay_webhook_events USING btree (received_at DESC);
CREATE INDEX idx_oxapay_wh_sigvalid ON public.oxapay_webhook_events USING btree (signature_valid);
CREATE INDEX idx_oxapay_wh_tx_hash ON public.oxapay_webhook_events USING btree (tx_hash);
CREATE INDEX idx_profiles_telegram_id ON public.profiles USING btree (telegram_id);
CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);
CREATE INDEX idx_provider_accounts_active_cooldown ON public.provider_accounts USING btree (is_active, cooldown_until);
CREATE INDEX idx_rzp_webhook_events_payment ON public.razorpay_webhook_events USING btree (payment_id);
CREATE INDEX idx_services_active ON public.services USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_services_category ON public.services USING btree (category);
CREATE INDEX idx_spm_service ON public.service_provider_mapping USING btree (service_id) WHERE (is_active = true);
CREATE INDEX idx_spm_service_active ON public.service_provider_mapping USING btree (service_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_subscriptions_user ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_subscriptions_user_status ON public.subscriptions USING btree (user_id, status);
CREATE INDEX idx_support_tickets_user ON public.support_tickets USING btree (user_id);
CREATE UNIQUE INDEX idx_transactions_razorpay_auto_reference_uniq ON public.transactions USING btree (payment_reference) WHERE ((payment_method = 'razorpay_auto'::text) AND (payment_reference IS NOT NULL));
CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);
CREATE INDEX idx_transactions_user_created ON public.transactions USING btree (user_id, created_at DESC);
CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_roles_user_role ON public.user_roles USING btree (user_id, role);
CREATE INDEX idx_wallets_user_id ON public.wallets USING btree (user_id);
CREATE INDEX idx_zapupi_deposits_status ON public.zapupi_deposits USING btree (status);
CREATE INDEX idx_zapupi_deposits_user ON public.zapupi_deposits USING btree (user_id);
CREATE INDEX idx_zapupi_webhook_events_order ON public.zapupi_webhook_events USING btree (order_id);
CREATE INDEX idx_zapupi_webhook_events_received ON public.zapupi_webhook_events USING btree (received_at DESC);
CREATE INDEX idx_zapupi_wh_received_at ON public.zapupi_webhook_events USING btree (received_at DESC);
CREATE INDEX idx_zapupi_wh_utr ON public.zapupi_webhook_events USING btree (utr);
CREATE UNIQUE INDEX uniq_active_rotation_lock ON public.organic_run_schedule USING btree (rotation_lock_key) WHERE (rotation_lock_key IS NOT NULL);
CREATE UNIQUE INDEX uniq_tx_zapupi_payment_ref ON public.transactions USING btree (payment_reference) WHERE ((payment_method = 'zapupi'::text) AND (payment_reference IS NOT NULL));
CREATE UNIQUE INDEX uniq_zapupi_deposits_txn_id ON public.zapupi_deposits USING btree (txn_id) WHERE (txn_id IS NOT NULL);
CREATE UNIQUE INDEX uniq_zapupi_deposits_utr ON public.zapupi_deposits USING btree (utr) WHERE (utr IS NOT NULL);
ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.engagement_bundles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.engagement_bundles
    ADD CONSTRAINT engagement_bundles_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);
ALTER TABLE ONLY public.engagement_order_items
    ADD CONSTRAINT engagement_order_items_engagement_order_id_fkey FOREIGN KEY (engagement_order_id) REFERENCES public.engagement_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.engagement_order_items
    ADD CONSTRAINT engagement_order_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);
ALTER TABLE ONLY public.engagement_orders
    ADD CONSTRAINT engagement_orders_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.engagement_bundles(id);
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.organic_run_schedule
    ADD CONSTRAINT organic_run_schedule_engagement_order_item_id_fkey FOREIGN KEY (engagement_order_item_id) REFERENCES public.engagement_order_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.organic_run_schedule
    ADD CONSTRAINT organic_run_schedule_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.organic_run_schedule
    ADD CONSTRAINT organic_run_schedule_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES public.provider_accounts(id);
ALTER TABLE ONLY public.oxapay_deposits
    ADD CONSTRAINT oxapay_deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.service_provider_mapping
    ADD CONSTRAINT service_provider_mapping_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES public.provider_accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.service_provider_mapping
    ADD CONSTRAINT service_provider_mapping_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.zapupi_deposits
    ADD CONSTRAINT zapupi_deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE FUNCTION public.admin_ban_user_and_cancel(p_target_user_id uuid, p_reason text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
  v_single_cancelled int := 0;
  v_eng_cancelled int := 0;
  v_runs_cancelled int := 0;
  v_items_cancelled int := 0;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user required';
  END IF;
  SELECT email INTO v_actor_email FROM public.profiles WHERE user_id = v_actor;
  SELECT email INTO v_target_email FROM public.profiles WHERE user_id = p_target_user_id;
  -- Mark the profile as banned (idempotent)
  UPDATE public.profiles
     SET is_banned = true,
         banned_at = COALESCE(banned_at, now()),
         banned_reason = COALESCE(NULLIF(btrim(p_reason),''), banned_reason, 'Manual ban by admin')
   WHERE user_id = p_target_user_id;
  -- Allow row-lock bypass on organic_run_schedule for this transaction
  PERFORM set_config('app.allow_run_edit','1', true);
  -- Cancel pending scheduled runs tied to this user's single orders
  WITH x AS (
    UPDATE public.organic_run_schedule rs
       SET status='cancelled',
           error_message = COALESCE(rs.error_message,'') ||
             CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END ||
             'Cancelled: user banned',
           completed_at = now()
     WHERE rs.status = 'pending'
       AND rs.order_id IN (SELECT id FROM public.orders WHERE user_id = p_target_user_id)
     RETURNING 1
  ) SELECT count(*) INTO v_runs_cancelled FROM x;
  -- Cancel pending scheduled runs tied to this user's engagement items
  WITH x AS (
    UPDATE public.organic_run_schedule rs
       SET status='cancelled',
           error_message = COALESCE(rs.error_message,'') ||
             CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END ||
             'Cancelled: user banned',
           completed_at = now()
     WHERE rs.status = 'pending'
       AND rs.engagement_order_item_id IN (
         SELECT eoi.id
           FROM public.engagement_order_items eoi
           JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
          WHERE eo.user_id = p_target_user_id
       )
     RETURNING 1
  ) SELECT v_runs_cancelled + count(*) INTO v_runs_cancelled FROM x;
  PERFORM set_config('app.allow_run_edit','0', true);
  -- Cancel engagement items still open
  WITH x AS (
    UPDATE public.engagement_order_items
       SET status = 'cancelled'
     WHERE status NOT IN ('completed','cancelled','failed')
       AND engagement_order_id IN (
         SELECT id FROM public.engagement_orders WHERE user_id = p_target_user_id
       )
     RETURNING 1
  ) SELECT count(*) INTO v_items_cancelled FROM x;
  -- Cancel engagement parent orders
  WITH x AS (
    UPDATE public.engagement_orders
       SET status = 'cancelled', updated_at = now()
     WHERE user_id = p_target_user_id
       AND status NOT IN ('completed','cancelled','failed')
     RETURNING 1
  ) SELECT count(*) INTO v_eng_cancelled FROM x;
  -- Cancel single orders
  WITH x AS (
    UPDATE public.orders
       SET status = 'cancelled', updated_at = now()
     WHERE user_id = p_target_user_id
       AND status NOT IN ('completed','cancelled','failed')
     RETURNING 1
  ) SELECT count(*) INTO v_single_cancelled FROM x;
  -- Audit log
  INSERT INTO public.admin_audit_log(
    actor_id, actor_email, target_user_id, target_email, action, notes, metadata
  ) VALUES (
    v_actor, v_actor_email, p_target_user_id, v_target_email,
    'ban_user',
    NULLIF(btrim(p_reason),''),
    jsonb_build_object(
      'single_orders_cancelled', v_single_cancelled,
      'engagement_orders_cancelled', v_eng_cancelled,
      'engagement_items_cancelled', v_items_cancelled,
      'pending_runs_cancelled', v_runs_cancelled
    )
  );
  RETURN json_build_object(
    'success', true,
    'banned_user_id', p_target_user_id,
    'single_orders_cancelled', v_single_cancelled,
    'engagement_orders_cancelled', v_eng_cancelled,
    'engagement_items_cancelled', v_items_cancelled,
    'pending_runs_cancelled', v_runs_cancelled
  );
END;
$$;
CREATE FUNCTION public.admin_unban_user(p_target_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_email text;
  v_actor_email text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden — admins only';
  END IF;
  SELECT email INTO v_email FROM public.profiles WHERE user_id = p_target_user_id;
  SELECT email INTO v_actor_email FROM public.profiles WHERE user_id = v_caller;
  UPDATE public.profiles
     SET is_banned = false, banned_at = NULL, banned_reason = NULL
   WHERE user_id = p_target_user_id;
  INSERT INTO public.admin_audit_log
    (actor_id, actor_email, target_user_id, target_email, action, notes)
  VALUES (v_caller, v_actor_email, p_target_user_id, v_email, 'user_unbanned', 'Unbanned via admin panel');
  RETURN jsonb_build_object('success', true, 'user_id', p_target_user_id);
END;
$$;
CREATE FUNCTION public.cancel_order_with_refund(p_order_id uuid, p_actor uuid, p_is_admin boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order public.orders;
  v_refund numeric := 0;
  v_refund_qty integer := 0;
  v_pending_qty integer := 0;
  v_balance numeric;
  v_spent numeric;
  v_new_balance numeric;
BEGIN
  IF p_order_id IS NULL OR p_actor IS NULL THEN
    RAISE EXCEPTION 'order_id and actor required';
  END IF;
  -- Lock the order row so concurrent cancel calls serialize
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  -- Authorization
  IF NOT p_is_admin AND v_order.user_id <> p_actor THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Idempotent: if already cancelled, do nothing (no double refund)
  IF v_order.status = 'cancelled' THEN
    RETURN json_build_object('success', true, 'already_cancelled', true, 'refund_amount', 0);
  END IF;
  IF v_order.is_organic_mode THEN
    -- Cancel only currently-pending runs and compute proportional refund
    PERFORM set_config('app.allow_run_edit','1',true);
    SELECT COALESCE(SUM(quantity_to_send),0) INTO v_pending_qty
      FROM public.organic_run_schedule
     WHERE order_id = v_order.id AND status = 'pending';
    UPDATE public.organic_run_schedule
       SET status = 'cancelled'
     WHERE order_id = v_order.id AND status = 'pending';
    PERFORM set_config('app.allow_run_edit','0',true);
    v_refund_qty := v_pending_qty;
    IF v_pending_qty > 0 AND v_order.quantity > 0 THEN
      v_refund := trunc((v_pending_qty::numeric / v_order.quantity::numeric) * v_order.price::numeric, 4);
    END IF;
  ELSE
    -- Refund only if order was strictly pending (not yet sent to provider)
    IF v_order.status = 'pending' THEN
      v_refund := trunc(v_order.price::numeric, 4);
      v_refund_qty := v_order.quantity;
    END IF;
  END IF;
  -- Flip order status while still holding the lock
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = v_order.id;
  -- Atomic wallet credit + transaction insert
  IF v_refund > 0 THEN
    SELECT balance, total_spent INTO v_balance, v_spent
      FROM public.wallets WHERE user_id = v_order.user_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet not found for refund';
    END IF;
    v_new_balance := trunc(COALESCE(v_balance,0) + v_refund, 4);
    UPDATE public.wallets
       SET balance = v_new_balance,
           total_spent = GREATEST(0, trunc(COALESCE(v_spent,0) - v_refund, 4)),
           updated_at = now()
     WHERE user_id = v_order.user_id;
    INSERT INTO public.transactions (
      user_id, type, amount, balance_after, order_id, description, status
    ) VALUES (
      v_order.user_id, 'refund', v_refund, v_new_balance, v_order.id,
      'Refund for cancelled order #' || v_order.order_number, 'completed'
    );
  END IF;
  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund,
    'refunded_quantity', v_refund_qty,
    'new_balance', v_new_balance
  );
END;
$$;
CREATE FUNCTION public.cancel_pending_runs_on_eo_cancel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    PERFORM set_config('app.allow_run_edit','1',true);
    UPDATE public.organic_run_schedule rs
       SET status='cancelled',
           error_message = COALESCE(rs.error_message,'') ||
             CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END
             || 'Auto-cancelled (parent order cancelled)'
     WHERE rs.status='pending'
       AND rs.engagement_order_item_id IN (
         SELECT id FROM public.engagement_order_items WHERE engagement_order_id = NEW.id
       );
    PERFORM set_config('app.allow_run_edit','0',true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.cancel_pending_runs_on_item_cancel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('cancelled','completed') AND COALESCE(OLD.status,'') NOT IN ('cancelled','completed') THEN
    PERFORM set_config('app.allow_run_edit','1',true);
    UPDATE public.organic_run_schedule rs
       SET status='cancelled',
           error_message = COALESCE(rs.error_message,'') ||
             CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END
             || 'Auto-cancelled (item ' || NEW.status || ')'
     WHERE rs.status='pending'
       AND rs.engagement_order_item_id = NEW.id;
    PERFORM set_config('app.allow_run_edit','0',true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.chat_conversations_lock_user_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid, 'admin'::app_role) THEN RETURN NEW; END IF;
  -- Non-admin owner: cannot change ownership, contact info, or timestamps
  NEW.user_id        := OLD.user_id;
  NEW.user_email     := OLD.user_email;
  NEW.user_name      := OLD.user_name;
  NEW.created_at     := OLD.created_at;
  NEW.last_message_at:= OLD.last_message_at;
  -- Status: only allow open/closed toggles by user
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('open','closed') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.cleanup_old_completed_engagement_orders() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_runs INT := 0;
  deleted_items INT := 0;
  deleted_orders INT := 0;
  deleted_stale_runs INT := 0;
BEGIN
  WITH target_orders AS (
    SELECT id FROM public.engagement_orders
    WHERE status IN ('completed','cancelled','failed','partial')
      AND COALESCE(completed_at, created_at) < now() - interval '1 day'
  ),
  target_items AS (
    SELECT eoi.id FROM public.engagement_order_items eoi
    JOIN target_orders t ON t.id = eoi.engagement_order_id
  ),
  del_runs AS (
    DELETE FROM public.organic_run_schedule
    WHERE engagement_order_item_id IN (SELECT id FROM target_items)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_runs FROM del_runs;
  WITH target_orders AS (
    SELECT id FROM public.engagement_orders
    WHERE status IN ('completed','cancelled','failed','partial')
      AND COALESCE(completed_at, created_at) < now() - interval '1 day'
  ),
  del_items AS (
    DELETE FROM public.engagement_order_items
    WHERE engagement_order_id IN (SELECT id FROM target_orders)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_items FROM del_items;
  WITH del_orders AS (
    DELETE FROM public.engagement_orders
    WHERE status IN ('completed','cancelled','failed','partial')
      AND COALESCE(completed_at, created_at) < now() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_orders FROM del_orders;
  WITH del_stale AS (
    DELETE FROM public.organic_run_schedule rs
    WHERE rs.status = 'pending'
      AND rs.engagement_order_item_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.engagement_order_items eoi
        JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
        WHERE eoi.id = rs.engagement_order_item_id
          AND (eoi.status IN ('paused','cancelled') OR eo.status IN ('paused','cancelled'))
      )
    RETURNING 1
  )
  SELECT count(*) INTO deleted_stale_runs FROM del_stale;
  RETURN json_build_object(
    'deleted_runs', deleted_runs,
    'deleted_items', deleted_items,
    'deleted_orders', deleted_orders,
    'deleted_stale_runs', deleted_stale_runs,
    'ran_at', now()
  );
END;
$$;
CREATE FUNCTION public.compute_rotation_lock_key() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_link text;
  v_type text;
BEGIN
  -- Only lock when run is actively held at a provider
  IF NEW.status = 'started'
     AND NEW.provider_order_id IS NOT NULL
     AND NEW.provider_account_id IS NOT NULL
     AND NEW.engagement_order_item_id IS NOT NULL THEN
    SELECT lower(btrim(eo.link)), lower(btrim(eoi.engagement_type))
      INTO v_link, v_type
    FROM public.engagement_order_items eoi
    JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
    WHERE eoi.id = NEW.engagement_order_item_id;
    IF v_link IS NOT NULL AND v_type IS NOT NULL AND v_link <> '' AND v_type <> '' THEN
      NEW.rotation_lock_key := v_link || '||' || v_type || '||' || NEW.provider_account_id::text;
    ELSE
      NEW.rotation_lock_key := NULL;
    END IF;
  ELSE
    NEW.rotation_lock_key := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.create_user_subscription() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'none', 'inactive')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;