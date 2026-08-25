-- Create subscriptions table to track user subscription status
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  plan_type text NOT NULL DEFAULT 'none' CHECK (plan_type IN ('none', 'monthly', 'lifetime')),
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'expired', 'cancelled')),
  activated_at timestamp with time zone,
  expires_at timestamp with time zone,
  activated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create subscription_requests table for manual approval flow
CREATE TABLE public.subscription_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'lifetime')),
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- RLS for subscriptions
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for subscription_requests
CREATE POLICY "Users can view own requests"
ON public.subscription_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests"
ON public.subscription_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests"
ON public.subscription_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_requests_updated_at
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create subscription automatically when user signs up (status = inactive)
CREATE OR REPLACE FUNCTION public.create_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'none', 'inactive')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_subscription();