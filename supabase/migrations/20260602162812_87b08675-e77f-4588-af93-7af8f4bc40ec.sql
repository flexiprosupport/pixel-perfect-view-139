ALTER TABLE public.provider_accounts
ADD COLUMN IF NOT EXISTS delivery_multiplier NUMERIC NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN public.provider_accounts.delivery_multiplier IS 'How much extra the provider delivers vs ordered qty. e.g. 2.0 means provider delivers 2x ordered (we will divide scheduled qty by this before sending). Min 0.5, default 1.0';