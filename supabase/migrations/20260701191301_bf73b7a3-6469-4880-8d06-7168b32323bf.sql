
-- 1) Unban samuel + credit ₹400 in one transaction
DO $$
DECLARE
  v_user uuid := '9b74a936-b7bf-4ba4-acc3-ca5fb40059e5';
  v_inr numeric := 400;
  v_usd numeric := trunc((400/90.0) * 10000) / 10000; -- 4.4444
  v_bal numeric;
  v_dep numeric;
  v_new_bal numeric;
  v_new_dep numeric;
BEGIN
  UPDATE public.profiles
     SET is_banned = false, banned_at = NULL, banned_reason = NULL
   WHERE user_id = v_user;

  SELECT balance, total_deposited INTO v_bal, v_dep
    FROM public.wallets WHERE user_id = v_user;

  v_new_bal := trunc((v_bal + v_usd) * 10000) / 10000;
  v_new_dep := trunc((v_dep + v_usd) * 10000) / 10000;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, status, payment_method)
  VALUES (v_user, 'deposit', v_usd, v_new_bal,
          'Admin manual credit — ₹400.00 (unban restore)', 'completed', 'manual_admin');

  UPDATE public.wallets
     SET balance = v_new_bal, total_deposited = v_new_dep
   WHERE user_id = v_user;

  INSERT INTO public.admin_audit_log
    (actor_id, actor_email, target_user_id, target_email, action, amount_usd, amount_inr, notes, metadata)
  VALUES ('581a69bb-fe78-4da6-98cd-f36fdeff8f28', 'zyrofit.my@gmail.com',
          v_user, 'samuelejidike50@gmail.com',
          'user_unbanned_and_credited', v_usd, v_inr,
          'Admin unban + ₹400 credit',
          jsonb_build_object('new_balance', v_new_bal));
END $$;

-- 2) Create admin_unban_user RPC for admin panel
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.admin_unban_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
