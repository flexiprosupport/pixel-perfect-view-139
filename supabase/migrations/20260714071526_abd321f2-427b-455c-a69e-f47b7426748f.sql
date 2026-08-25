-- Add cooldown + failure observability to provider_accounts so the rotation
-- algorithm can skip accounts that just failed / are rate-limited.
ALTER TABLE public.provider_accounts
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_provider_accounts_active_cooldown
  ON public.provider_accounts (is_active, cooldown_until);