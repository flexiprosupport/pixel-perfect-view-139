-- Fix 1: Profiles Table - Only authenticated users can access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Users can only view their own profile (authenticated only)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles (authenticated only)  
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Providers Public View - Enable security invoker
ALTER VIEW public.providers_public SET (security_invoker = on);