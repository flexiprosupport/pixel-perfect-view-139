ALTER TABLE public.plisio_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.plisio_webhook_events TO authenticated;
GRANT ALL ON public.plisio_webhook_events TO service_role;
DROP POLICY IF EXISTS "Admins can view plisio webhook events" ON public.plisio_webhook_events;
CREATE POLICY "Admins can view plisio webhook events"
ON public.plisio_webhook_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));