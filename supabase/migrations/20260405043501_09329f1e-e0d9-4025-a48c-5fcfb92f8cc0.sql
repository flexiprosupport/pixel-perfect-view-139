ALTER TABLE public.organic_run_schedule
ADD COLUMN IF NOT EXISTS provider_account_name text;

UPDATE public.organic_run_schedule ors
SET provider_account_name = pa.name
FROM public.provider_accounts pa
WHERE ors.provider_account_id = pa.id
  AND (ors.provider_account_name IS NULL OR ors.provider_account_name = '');