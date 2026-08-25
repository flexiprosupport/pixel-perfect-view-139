-- Fix SECURITY DEFINER view issue - drop and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.providers_public;

-- Recreate without SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW public.providers_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  api_url,
  is_active,
  created_at,
  updated_at
FROM public.providers
WHERE is_active = true;

-- Grant select to authenticated users
GRANT SELECT ON public.providers_public TO authenticated;
GRANT SELECT ON public.providers_public TO anon;