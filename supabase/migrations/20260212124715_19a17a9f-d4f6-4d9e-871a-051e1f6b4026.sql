
-- Update handle_new_user to auto-create 7-day trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Auto-create 7-day free trial subscription
  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at)
  VALUES (NEW.id, 'trial', 'active', now(), now() + interval '7 days')
  ON CONFLICT (user_id) DO UPDATE 
  SET plan_type = 'trial', 
      status = 'active', 
      activated_at = now(), 
      expires_at = now() + interval '7 days'
  WHERE subscriptions.status = 'inactive' AND subscriptions.plan_type = 'none';
  
  RETURN NEW;
END;
$$;

-- Also update create_user_subscription to default to trial
CREATE OR REPLACE FUNCTION public.create_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at)
  VALUES (NEW.id, 'trial', 'active', now(), now() + interval '7 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
