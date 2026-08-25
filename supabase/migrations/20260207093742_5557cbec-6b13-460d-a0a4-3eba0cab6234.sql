-- Add columns to track provider real-time status
ALTER TABLE public.organic_run_schedule 
ADD COLUMN IF NOT EXISTS provider_start_count integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS provider_remains integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS provider_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS provider_charge numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_status_check timestamp with time zone DEFAULT NULL;

-- Add index for faster status queries
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_check 
ON public.organic_run_schedule(status, last_status_check);

COMMENT ON COLUMN public.organic_run_schedule.provider_start_count IS 'Initial count from provider when order started';
COMMENT ON COLUMN public.organic_run_schedule.provider_remains IS 'Remaining quantity to deliver from provider';
COMMENT ON COLUMN public.organic_run_schedule.provider_status IS 'Current status from provider (Pending, In progress, Processing, Completed, etc.)';
COMMENT ON COLUMN public.organic_run_schedule.provider_charge IS 'Actual charge from provider for this run';
COMMENT ON COLUMN public.organic_run_schedule.last_status_check IS 'Last time provider status was checked';