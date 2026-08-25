-- Fix 1: Restrict admin SELECT policy on platform_settings to authenticated role
DROP POLICY IF EXISTS "Admins read platform settings" ON public.platform_settings;
CREATE POLICY "Admins read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add column-level privilege lock on profiles so authenticated users
-- physically cannot UPDATE sensitive columns (defense-in-depth alongside the
-- existing trg_profiles_lock_user_columns trigger). Admins/service_role paths
-- go through SECURITY DEFINER functions (admin_ban_user_and_cancel,
-- admin_unban_user) which run with elevated privileges, so revoking these
-- column UPDATEs from authenticated does not break admin flows.
REVOKE UPDATE (user_id, email, api_key, is_banned, banned_at, banned_reason, created_at)
  ON public.profiles FROM authenticated;

-- Re-grant UPDATE only on user-editable columns
GRANT UPDATE (full_name, updated_at) ON public.profiles TO authenticated;

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS
  'Users may only update non-sensitive profile columns. Column-level privileges revoke UPDATE on user_id/email/api_key/is_banned/banned_at/banned_reason/created_at; trg_profiles_lock_user_columns provides an additional trigger-level guard.';