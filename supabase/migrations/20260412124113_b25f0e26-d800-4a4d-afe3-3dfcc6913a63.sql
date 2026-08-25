-- Allow users to update their own engagement orders (for cancel/pause)
CREATE POLICY "Users can update own engagement_orders"
ON public.engagement_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own engagement order items (for cancel/pause)
CREATE POLICY "Users can update own engagement_order_items"
ON public.engagement_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM engagement_orders
    WHERE engagement_orders.id = engagement_order_items.engagement_order_id
    AND engagement_orders.user_id = auth.uid()
  )
);