-- 1) popup_ads: restrict public reads to enabled + in-schedule ads only
DROP POLICY IF EXISTS "popup_ads public read" ON public.popup_ads;
CREATE POLICY "popup_ads public read" ON public.popup_ads
FOR SELECT TO public
USING (
  enabled = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

-- 2) wallets: block any direct user INSERT/UPDATE; only service role (backend) may write
CREATE OR REPLACE FUNCTION public.wallets_block_direct_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses RLS anyway; this guard stops authenticated/anon direct writes
  IF (current_setting('request.jwt.claims', true) IS NULL
      OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('authenticated', 'anon')) THEN
    RAISE EXCEPTION 'Wallet rows can only be modified by the backend';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_block_direct_writes ON public.wallets;
CREATE TRIGGER wallets_block_direct_writes
BEFORE INSERT OR UPDATE OR DELETE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.wallets_block_direct_writes();