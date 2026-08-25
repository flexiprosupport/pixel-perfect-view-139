
-- 1) Ban + cancel-all RPC (admin only). One-way; no unban exposed.
CREATE OR REPLACE FUNCTION public.admin_ban_user_and_cancel(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.admin_ban_user_and_cancel(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_user_and_cancel(uuid, text) TO authenticated;

-- 2) Extend user summary with is_banned so UI can badge
CREATE OR REPLACE FUNCTION public.get_admin_users_summary()
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
$function$;
