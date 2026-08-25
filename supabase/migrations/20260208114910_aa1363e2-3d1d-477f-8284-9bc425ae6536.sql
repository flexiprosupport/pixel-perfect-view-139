-- Add retry_count column to organic_run_schedule for tracking automatic retries
ALTER TABLE public.organic_run_schedule 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.organic_run_schedule.retry_count IS 'Number of times this run has been automatically retried after failure';