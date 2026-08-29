ALTER TABLE public.zapupi_deposits
  ADD COLUMN IF NOT EXISTS verify_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verify_error text,
  ADD COLUMN IF NOT EXISTS last_verify_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_verify_at timestamptz,
  ADD COLUMN IF NOT EXISTS credited_at timestamptz;

CREATE INDEX IF NOT EXISTS zapupi_deposits_pending_idx
  ON public.zapupi_deposits (credited, next_verify_at)
  WHERE credited = false;