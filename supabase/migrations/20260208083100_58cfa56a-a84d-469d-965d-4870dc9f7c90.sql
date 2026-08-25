-- Create RPC function to fetch cron jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT jobid, jobname, schedule, active
  FROM cron.job
  ORDER BY jobname;
$$;

-- Create RPC function to fetch recent cron run details
CREATE OR REPLACE FUNCTION public.get_cron_run_details(limit_count integer DEFAULT 50)
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamp with time zone,
  end_time timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT 
    runid,
    jobid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
  FROM cron.job_run_details
  ORDER BY start_time DESC
  LIMIT limit_count;
$$;

-- Grant execute permissions to authenticated users (admin check is in edge function)
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_run_details(integer) TO authenticated;