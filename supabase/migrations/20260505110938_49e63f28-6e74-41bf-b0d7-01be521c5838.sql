
-- Reset all failed engagement runs so they retry with fresh provider rotation
UPDATE organic_run_schedule rs
SET status = 'pending',
    error_message = NULL,
    scheduled_at = now(),
    retry_count = 0,
    provider_account_id = NULL,
    provider_account_name = NULL,
    started_at = NULL,
    provider_order_id = NULL,
    provider_response = NULL,
    provider_status = NULL,
    provider_remains = NULL,
    provider_start_count = NULL,
    last_status_check = NULL
FROM engagement_order_items eoi
JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
WHERE rs.engagement_order_item_id = eoi.id
  AND rs.status = 'failed'
  AND eoi.status NOT IN ('paused','cancelled')
  AND eo.status NOT IN ('paused','cancelled');
