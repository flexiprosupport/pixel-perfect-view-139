REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM anon;
REVOKE ALL ON FUNCTION public.pg_advisory_xact_lock(bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.pg_advisory_xact_lock(bigint) TO service_role;