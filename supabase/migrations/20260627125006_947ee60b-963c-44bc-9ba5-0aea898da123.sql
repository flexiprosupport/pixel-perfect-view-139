
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE user_id = _user_id), false)
$$;

UPDATE public.profiles
   SET is_banned = true,
       banned_reason = 'Fraud: $24.08 phantom deposit with no gateway/admin trace (2026-06-11)',
       banned_at = now()
 WHERE email = 'gamerayush10@gmail.com';

UPDATE public.orders
   SET status = 'cancelled', updated_at = now()
 WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'gamerayush10@gmail.com')
   AND status IN ('pending','processing','in_progress');

UPDATE public.organic_run_schedule
   SET status = 'cancelled',
       error_message = COALESCE(error_message,'') || ' | Banned user — fraud'
 WHERE status = 'pending'
   AND order_id IN (
     SELECT id FROM public.orders
      WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'gamerayush10@gmail.com')
   );

UPDATE public.engagement_orders
   SET status = 'cancelled', updated_at = now()
 WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'gamerayush10@gmail.com')
   AND status NOT IN ('completed','cancelled','failed');

UPDATE public.wallets
   SET balance = 0, updated_at = now()
 WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'gamerayush10@gmail.com');

INSERT INTO public.admin_audit_log (actor_id, actor_email, target_user_id, target_email, action, notes, metadata)
SELECT
  (SELECT user_id FROM public.profiles WHERE email='zyrofit.my@gmail.com' LIMIT 1),
  'zyrofit.my@gmail.com',
  p.user_id,
  p.email,
  'ban_user',
  'Fraud — $24.08 phantom deposit, no gateway/admin trace. All orders cancelled, wallet zeroed.',
  jsonb_build_object('cancelled_orders', true, 'wallet_zeroed', true)
FROM public.profiles p WHERE p.email = 'gamerayush10@gmail.com';
