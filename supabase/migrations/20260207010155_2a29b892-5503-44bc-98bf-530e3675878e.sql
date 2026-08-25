-- Fix Critical Security: Provider API keys should NOT be visible to regular users
-- Only admins should be able to see API keys

-- Drop existing "Everyone can view active providers" policy
DROP POLICY IF EXISTS "Everyone can view active providers" ON public.providers;

-- Create new policy that only allows viewing non-sensitive columns for regular users
-- The api_key column should never be exposed to non-admin users

-- Create a view for public provider info (without API key)
CREATE OR REPLACE VIEW public.providers_public AS
SELECT 
  id,
  name,
  api_url,
  is_active,
  created_at,
  updated_at
FROM public.providers
WHERE is_active = true;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.providers_public TO authenticated;

-- Now update RLS: Only admins can view full providers table
CREATE POLICY "Admins can view all provider details"
ON public.providers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable leaked password protection
-- Note: This is a Supabase setting, not SQL, but we can add a check constraint for password complexity