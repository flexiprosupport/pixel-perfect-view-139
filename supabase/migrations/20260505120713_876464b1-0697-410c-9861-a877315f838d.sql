-- Backfill completed_at from updated_at for terminal orders where it was just touched today
UPDATE public.engagement_orders
SET completed_at = updated_at
WHERE status IN ('completed','cancelled','failed','partial')
  AND updated_at < now() - interval '1 day';

SELECT public.cleanup_old_completed_engagement_orders();