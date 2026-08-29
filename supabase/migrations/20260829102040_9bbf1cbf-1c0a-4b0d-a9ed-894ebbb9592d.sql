
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  api_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_api_keys TO authenticated;
GRANT ALL ON public.user_api_keys TO service_role;

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own api key" ON public.user_api_keys;
CREATE POLICY "Users view own api key" ON public.user_api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.rotate_my_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
  v_banned boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_banned INTO v_banned FROM public.profiles WHERE user_id = v_uid;
  IF coalesce(v_banned, false) THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  v_key := 'fp_' || encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.user_api_keys (user_id, api_key)
  VALUES (v_uid, v_key)
  ON CONFLICT (user_id) DO UPDATE
    SET api_key = EXCLUDED.api_key, updated_at = now();

  RETURN v_key;
END;
$function$;

REVOKE ALL ON FUNCTION public.rotate_my_api_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_my_api_key() TO authenticated;
