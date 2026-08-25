CREATE OR REPLACE FUNCTION public.__restore_exec(p_sql text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN EXECUTE p_sql; END $$;
REVOKE ALL ON FUNCTION public.__restore_exec(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.__restore_exec(text) TO sandbox_exec;