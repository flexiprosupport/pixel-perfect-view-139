UPDATE organic_run_schedule rs
SET status = 'pending',
    error_message = NULL,
    started_at = NULL,
    completed_at = NULL,
    provider_order_id = NULL,
    provider_response = NULL,
    scheduled_at = now()
FROM engagement_order_items eoi
JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
WHERE rs.engagement_order_item_id = eoi.id
  AND rs.status = 'failed'
  AND eoi.engagement_type ILIKE '%like%'
  AND eoi.status NOT IN ('paused','cancelled')
  AND eo.status NOT IN ('paused','cancelled')
  AND rs.error_message ILIKE '%refunded by provider%';