-- RLS policies call has_role(uuid, text); without EXECUTE, every policy check errors with 403
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;