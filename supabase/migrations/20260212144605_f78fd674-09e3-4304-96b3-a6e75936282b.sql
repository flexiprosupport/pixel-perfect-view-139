
-- Add a column to organic_run_schedule to cache provider account name
-- This way users can see it without needing access to provider_accounts table
ALTER TABLE public.organic_run_schedule 
ADD COLUMN IF NOT EXISTS provider_account_name text;

-- Backfill existing data
UPDATE public.organic_run_schedule ors
SET provider_account_name = pa.name
FROM public.provider_accounts pa
WHERE ors.provider_account_id = pa.id
AND ors.provider_account_name IS NULL;
