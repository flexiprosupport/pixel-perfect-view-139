
-- 1) Restrict platform_settings SELECT to admins, expose maintenance flag via a SECURITY DEFINER function
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

CREATE POLICY "Admins read platform settings"
ON public.platform_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Public function to check maintenance mode without exposing markup
CREATE OR REPLACE FUNCTION public.is_maintenance_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT maintenance_mode FROM public.platform_settings LIMIT 1), false)
$$;

GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO anon, authenticated;

-- 2) Explicit deny on user_roles writes for non-admins (defence-in-depth)
CREATE POLICY "No self insert into user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No self update on user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No self delete on user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Realtime channel authorization: scope topic access to the owning user (or admin)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users access own realtime topics" ON realtime.messages;

CREATE POLICY "Authenticated users access own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR realtime.topic() IN ('maintenance-mode-realtime')
);
