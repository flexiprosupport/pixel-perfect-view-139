-- Drop the existing function first
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function without the auto-create 7-day free trial subscription logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create profile for new user
    INSERT INTO public.profiles (id, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create wallet for new user
    INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- NOTE: Intentionally omitting the auto-create free trial subscription logic
    -- Users must now request a subscription via the dashboard and get admin approval.

    RETURN NEW;
END;
$$;

-- Note: We also need to update existing users who might have the 'trial' plan
UPDATE public.subscriptions
SET status = 'expired'
WHERE plan_type = 'trial' AND status = 'active';

-- Remove the 'trial' subscriptions entirely to be clean
DELETE FROM public.subscriptions WHERE plan_type = 'trial';
