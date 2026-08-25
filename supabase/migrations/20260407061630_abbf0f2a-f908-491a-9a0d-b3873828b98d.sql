
CREATE POLICY "Users update own pending runs"
ON public.organic_run_schedule
FOR UPDATE
TO authenticated
USING (
  (status = 'pending') AND (
    (EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = organic_run_schedule.order_id
      AND orders.user_id = auth.uid()
    )) OR (EXISTS (
      SELECT 1 FROM engagement_order_items eoi
      JOIN engagement_orders eo ON eo.id = eoi.engagement_order_id
      WHERE eoi.id = organic_run_schedule.engagement_order_item_id
      AND eo.user_id = auth.uid()
    ))
  )
);
