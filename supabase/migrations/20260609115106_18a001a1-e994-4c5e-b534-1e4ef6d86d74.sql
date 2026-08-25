CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text,
  payment_id text,
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.razorpay_webhook_events TO service_role;

ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.razorpay_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rzp_webhook_events_payment ON public.razorpay_webhook_events(payment_id);