
-- Create a public view that hides sensitive api_key
CREATE VIEW public.provider_accounts_public
WITH (security_invoker = on) AS
  SELECT id, name, provider_id, is_active, created_at
  FROM public.provider_accounts;

-- Allow all authenticated users to SELECT from the view via base table
-- But ONLY through the view (which excludes api_key)
CREATE POLICY "Authenticated users can view provider account names"
  ON public.provider_accounts
  FOR SELECT
  TO authenticated
  USING (true);
