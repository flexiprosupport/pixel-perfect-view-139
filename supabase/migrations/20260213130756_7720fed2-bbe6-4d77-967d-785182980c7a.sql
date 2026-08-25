-- Drop the old check constraint and recreate with 'trial' included
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_plan_type_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check CHECK (plan_type = ANY (ARRAY['none'::text, 'monthly'::text, 'lifetime'::text, 'trial'::text]));