-- Enable realtime for organic_run_schedule and engagement_order_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.organic_run_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_orders;