
-- Drop the broad SELECT policy (too permissive - exposes api_key)
DROP POLICY "Authenticated users can view provider account names" ON public.provider_accounts;
