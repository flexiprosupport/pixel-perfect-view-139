
-- Column-level grant: regular users can only touch `status` on direct UPDATE.
-- Rescheduling goes through reschedule_organic_run RPC (SECURITY DEFINER, runs as owner — column grants don't apply).
REVOKE UPDATE ON public.organic_run_schedule FROM authenticated;
GRANT UPDATE (status) ON public.organic_run_schedule TO authenticated;
