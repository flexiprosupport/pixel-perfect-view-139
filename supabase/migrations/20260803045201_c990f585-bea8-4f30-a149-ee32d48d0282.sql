CREATE OR REPLACE FUNCTION public.export_auth_users()
RETURNS TABLE(
  id uuid,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  phone text,
  is_super_admin boolean,
  role text,
  aud text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text, u.encrypted_password::text, u.email_confirmed_at,
         u.created_at, u.updated_at, u.last_sign_in_at,
         u.raw_user_meta_data, u.raw_app_meta_data, u.phone::text,
         u.is_super_admin, u.role::text, u.aud::text
  FROM auth.users u
  ORDER BY u.created_at;
$$;

REVOKE ALL ON FUNCTION public.export_auth_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_auth_users() TO service_role;