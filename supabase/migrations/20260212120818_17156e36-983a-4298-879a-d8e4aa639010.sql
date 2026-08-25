
CREATE POLICY "Users can update own order items"
ON public.engagement_order_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM engagement_orders
    WHERE engagement_orders.id = engagement_order_items.engagement_order_id
    AND engagement_orders.user_id = auth.uid()
  )
);
