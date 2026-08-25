-- Add first-class amount columns for easier admin debugging
ALTER TABLE public.plisio_webhook_events
  ADD COLUMN IF NOT EXISTS amount_inr numeric,
  ADD COLUMN IF NOT EXISTS source_amount numeric,
  ADD COLUMN IF NOT EXISTS replay_of uuid REFERENCES public.plisio_webhook_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plisio_events_received_at
  ON public.plisio_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_plisio_events_sig_valid
  ON public.plisio_webhook_events (signature_valid, received_at DESC);