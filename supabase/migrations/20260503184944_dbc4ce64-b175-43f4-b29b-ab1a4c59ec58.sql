ALTER TABLE public.provider_accounts
  ADD COLUMN IF NOT EXISTS balance numeric,
  ADD COLUMN IF NOT EXISTS balance_currency text,
  ADD COLUMN IF NOT EXISTS balance_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS low_balance_threshold numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_low_balance_alert_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_balance_error text;