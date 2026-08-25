
ALTER TABLE public.oxapay_webhook_events
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS pay_currency text,
  ADD COLUMN IF NOT EXISTS expected_amount numeric,
  ADD COLUMN IF NOT EXISTS received_amount numeric,
  ADD COLUMN IF NOT EXISTS amount_match boolean,
  ADD COLUMN IF NOT EXISTS http_method text,
  ADD COLUMN IF NOT EXISTS headers jsonb,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS signature_expected text,
  ADD COLUMN IF NOT EXISTS signature_received text,
  ADD COLUMN IF NOT EXISTS raw_body text;

CREATE INDEX IF NOT EXISTS idx_oxapay_wh_tx_hash ON public.oxapay_webhook_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_oxapay_wh_received_at ON public.oxapay_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_oxapay_wh_sigvalid ON public.oxapay_webhook_events(signature_valid);

ALTER TABLE public.zapupi_webhook_events
  ADD COLUMN IF NOT EXISTS expected_amount numeric,
  ADD COLUMN IF NOT EXISTS received_amount numeric,
  ADD COLUMN IF NOT EXISTS amount_match boolean,
  ADD COLUMN IF NOT EXISTS http_method text,
  ADD COLUMN IF NOT EXISTS headers jsonb,
  ADD COLUMN IF NOT EXISTS source_ip text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_result jsonb,
  ADD COLUMN IF NOT EXISTS raw_body text;

CREATE INDEX IF NOT EXISTS idx_zapupi_wh_received_at ON public.zapupi_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_zapupi_wh_utr ON public.zapupi_webhook_events(utr);
