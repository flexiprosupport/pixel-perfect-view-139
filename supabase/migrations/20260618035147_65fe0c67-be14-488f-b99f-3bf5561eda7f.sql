-- Auto-cancel pending runs when their engagement order/item is cancelled

CREATE OR REPLACE FUNCTION public.cancel_pending_runs_on_eo_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    PERFORM set_config('app.allow_run_edit','1',true);
    UPDATE public.organic_run_schedule rs
       SET status='cancelled',
           error_message = COALESCE(rs.error_message,'') ||
             CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END
             || 'Auto-cancelled (parent order cancelled)'
     WHERE rs.status='pending'
       AND rs.engagement_order_item_id IN (
         SELECT id FROM public.engagement_order_items WHERE engagement_order_id = NEW.id
       );
    PERFORM set_config('app.allow_run_edit','0',true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_runs_on_eo_cancel ON public.engagement_orders;
CREATE TRIGGER trg_cancel_runs_on_eo_cancel
AFTER UPDATE OF status ON public.engagement_orders
FOR EACH ROW EXECUTE FUNCTION public.cancel_pending_runs_on_eo_cancel();

CREATE OR REPLACE FUNCTION public.cancel_pending_runs_on_item_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('cancelled','completed') AND COALESCE(OLD.status,'') NOT IN ('cancelled','completed') THEN
    PERFORM set_config('app.allow_run_edit','1',true);
    UPDATE public.organic_run_schedule rs
       SET status='cancelled',
           error_message = COALESCE(rs.error_message,'') ||
             CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END
             || 'Auto-cancelled (item ' || NEW.status || ')'
     WHERE rs.status='pending'
       AND rs.engagement_order_item_id = NEW.id;
    PERFORM set_config('app.allow_run_edit','0',true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_runs_on_item_status ON public.engagement_order_items;
CREATE TRIGGER trg_cancel_runs_on_item_status
AFTER UPDATE OF status ON public.engagement_order_items
FOR EACH ROW EXECUTE FUNCTION public.cancel_pending_runs_on_item_cancel();

-- One-off backfill: cancel orphan pending runs whose parent order/item is cancelled
DO $$
BEGIN
  PERFORM set_config('app.allow_run_edit','1',true);
  UPDATE public.organic_run_schedule rs
     SET status='cancelled',
         error_message = COALESCE(rs.error_message,'') ||
           CASE WHEN COALESCE(rs.error_message,'')='' THEN '' ELSE ' | ' END
           || 'Backfill: parent cancelled/completed'
   WHERE rs.status='pending'
     AND rs.engagement_order_item_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.engagement_order_items eoi
       JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
       WHERE eoi.id = rs.engagement_order_item_id
         AND (eoi.status IN ('cancelled','completed') OR eo.status = 'cancelled')
     );
  PERFORM set_config('app.allow_run_edit','0',true);
END $$;