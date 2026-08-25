
CREATE TABLE IF NOT EXISTS public.zapupi_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  order_id text NOT NULL,
  txn_id text,
  utr text,
  status text,
  source text NOT NULL DEFAULT 'webhook',
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zapupi_webhook_events_order ON public.zapupi_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_zapupi_webhook_events_received ON public.zapupi_webhook_events(received_at DESC);

GRANT ALL ON public.zapupi_webhook_events TO service_role;

ALTER TABLE public.zapupi_webhook_events ENABLE ROW LEVEL SECURITY;

-- No client access — service role only (bypasses RLS). Admin reads go through edge functions.
CREATE POLICY "no client access" ON public.zapupi_webhook_events FOR ALL TO authenticated USING (false) WITH CHECK (false);
