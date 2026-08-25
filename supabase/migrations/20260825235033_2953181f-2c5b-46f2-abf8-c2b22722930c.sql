DROP POLICY IF EXISTS "No self delete on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "No self insert into user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "No self update on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;