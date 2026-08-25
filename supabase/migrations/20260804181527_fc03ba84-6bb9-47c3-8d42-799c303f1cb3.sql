CREATE OR REPLACE FUNCTION public.export_auth_users_for_backup(p_limit int DEFAULT 500, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid,
  email text,
  encrypted_password text,
  phone text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email::text, u.encrypted_password::text, u.phone::text,
         u.email_confirmed_at, u.raw_user_meta_data, u.raw_app_meta_data,
         u.created_at, u.last_sign_in_at
  FROM auth.users u
  ORDER BY u.created_at, u.id
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.export_auth_users_for_backup(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_auth_users_for_backup(int, int) FROM anon;
REVOKE ALL ON FUNCTION public.export_auth_users_for_backup(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.export_auth_users_for_backup(int, int) TO service_role;