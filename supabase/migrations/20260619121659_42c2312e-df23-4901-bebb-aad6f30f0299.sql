CREATE TABLE IF NOT EXISTS public.rotation_alert_state (
  alert_key text PRIMARY KEY,
  last_count integer NOT NULL DEFAULT 0,
  last_alerted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT ALL ON public.rotation_alert_state TO service_role;
ALTER TABLE public.rotation_alert_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read rotation alerts"
  ON public.rotation_alert_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));