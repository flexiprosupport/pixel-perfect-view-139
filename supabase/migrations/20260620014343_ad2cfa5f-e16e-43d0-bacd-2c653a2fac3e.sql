-- Revert falsely auto-completed runs back to "started" so live tracking reflects real provider state.
UPDATE public.organic_run_schedule
SET status = 'started',
    completed_at = NULL,
    error_message = 'Reverted: was falsely auto-completed; provider still in progress'
WHERE status = 'completed'
  AND error_message = 'Auto-completed (provider remains reached 0)'
  AND provider_remains IS NOT NULL
  AND provider_remains > 0
  AND provider_status IN ('In progress','Pending','Processing','Inprogress','Awaiting');