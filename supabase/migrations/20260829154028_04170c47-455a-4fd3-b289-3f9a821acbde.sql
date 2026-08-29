CREATE OR REPLACE FUNCTION public.wallets_block_direct_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims text;
BEGIN
  claims := current_setting('request.jwt.claims', true);
  -- Block only when a PostgREST request carries an authenticated/anon JWT.
  -- Service-role (secret key, no JWT) and internal triggers are unaffected.
  IF claims IS NOT NULL AND (claims::jsonb ->> 'role') IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Wallet rows can only be modified by the backend';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;