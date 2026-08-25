-- Allow engagement-order schedules to exist without legacy orders.order_id
ALTER TABLE public.organic_run_schedule
ALTER COLUMN order_id DROP NOT NULL;