CREATE OR REPLACE FUNCTION public.rotate_my_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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

  -- gen_random_uuid() is core Postgres (no pgcrypto dependency)
  v_key := 'fp_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.user_api_keys (user_id, api_key)
  VALUES (v_uid, v_key)
  ON CONFLICT (user_id) DO UPDATE
    SET api_key = EXCLUDED.api_key, updated_at = now();

  RETURN v_key;
END;
$function$;

REVOKE ALL ON FUNCTION public.rotate_my_api_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_my_api_key() TO authenticated;