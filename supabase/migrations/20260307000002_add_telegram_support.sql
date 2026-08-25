-- Add telegram_id to profiles
-- Allow user_id to be NULL for bot-only shadow users
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;

-- Function to handle bot-only users
CREATE OR REPLACE FUNCTION public.get_or_create_bot_user(_telegram_id TEXT, _full_name TEXT DEFAULT '')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Allow wallets to have profile_id identifier too or make user_id nullable
ALTER TABLE public.wallets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);
