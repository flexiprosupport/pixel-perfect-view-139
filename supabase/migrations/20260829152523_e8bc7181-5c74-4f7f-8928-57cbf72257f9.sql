DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profiles.id
        AND p.is_banned IS NOT DISTINCT FROM profiles.is_banned
        AND p.banned_reason IS NOT DISTINCT FROM profiles.banned_reason
        AND p.banned_at IS NOT DISTINCT FROM profiles.banned_at
        AND p.email IS NOT DISTINCT FROM profiles.email
        AND p.user_id IS NOT DISTINCT FROM profiles.user_id
    )
  )
);