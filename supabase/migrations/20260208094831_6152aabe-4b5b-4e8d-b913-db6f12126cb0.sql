-- Add INSERT policy for organic_run_schedule so users can create runs for their own engagement orders
CREATE POLICY "Users can insert runs for own engagement orders"
ON public.organic_run_schedule
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM engagement_order_items eoi
    JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
    WHERE eoi.id = organic_run_schedule.engagement_order_item_id
      AND eo.user_id = auth.uid()
  )
);

-- Also add INSERT policy for legacy orders
CREATE POLICY "Users can insert runs for own orders"
ON public.organic_run_schedule
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.id = organic_run_schedule.order_id
      AND orders.user_id = auth.uid()
  )
);