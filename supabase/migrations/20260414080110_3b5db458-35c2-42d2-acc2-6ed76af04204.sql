
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_scheduled 
  ON organic_run_schedule (status, scheduled_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_started 
  ON organic_run_schedule (status) 
  WHERE status = 'started';

CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_item_id 
  ON organic_run_schedule (engagement_order_item_id) 
  WHERE engagement_order_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_failed 
  ON organic_run_schedule (status, retry_count) 
  WHERE status = 'failed';
