CREATE OR REPLACE FUNCTION public.fp_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = NEW.id LIMIT 1;
  END IF;

  INSERT INTO public.wallets (user_id, profile_id, balance)
  SELECT NEW.id, v_profile_id, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = NEW.id);

  IF lower(COALESCE(NEW.email,'')) = 'flexipro.support@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fp_on_auth_user_created ON auth.users;
CREATE TRIGGER fp_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fp_handle_new_user();

INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, COALESCE(u.email,''), COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email,''), '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

INSERT INTO public.wallets (user_id, profile_id, balance)
SELECT p.user_id, p.id, 0
FROM public.profiles p
WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = p.user_id);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE lower(COALESCE(u.email,'')) = 'flexipro.support@gmail.com'
ON CONFLICT DO NOTHING;

REVOKE ALL ON public.user_api_keys FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_api_keys FROM authenticated;
GRANT SELECT ON public.user_api_keys TO authenticated;
GRANT ALL ON public.user_api_keys TO service_role;