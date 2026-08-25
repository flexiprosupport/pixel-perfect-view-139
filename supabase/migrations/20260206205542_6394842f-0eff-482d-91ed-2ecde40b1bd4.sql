-- Create engagement_bundles table (Combo Packs for platforms)
CREATE TABLE public.engagement_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'twitter', 'facebook'
  provider_id TEXT REFERENCES public.providers(id),
  description TEXT,
  icon TEXT DEFAULT 'rocket',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bundle_items table (Services linked to bundles)
CREATE TABLE public.bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.engagement_bundles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  engagement_type TEXT NOT NULL, -- 'views', 'likes', 'comments', 'saves', 'shares'
  ratio_percent NUMERIC DEFAULT 100, -- percentage of base (100 for views, 6 for likes, etc.)
  is_base BOOLEAN DEFAULT false, -- is this the base service (Views)
  default_drip_qty_per_run INTEGER DEFAULT 500,
  default_drip_interval INTEGER DEFAULT 1,
  default_drip_interval_unit TEXT DEFAULT 'hours',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create engagement_orders table (Parent Order for full engagement)
CREATE TABLE public.engagement_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  user_id UUID NOT NULL,
  bundle_id UUID REFERENCES public.engagement_bundles(id),
  link TEXT NOT NULL,
  base_quantity INTEGER NOT NULL,
  total_price NUMERIC NOT NULL,
  is_organic_mode BOOLEAN DEFAULT true,
  variance_percent INTEGER DEFAULT 25,
  peak_hours_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'partial', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create engagement_order_items table (Child Orders per Engagement Type)
CREATE TABLE public.engagement_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_order_id UUID NOT NULL REFERENCES public.engagement_orders(id) ON DELETE CASCADE,
  engagement_type TEXT NOT NULL, -- 'views', 'likes', 'comments', 'saves', 'shares'
  service_id UUID REFERENCES public.services(id),
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  drip_qty_per_run INTEGER,
  drip_interval INTEGER,
  drip_interval_unit TEXT DEFAULT 'hours',
  speed_preset TEXT DEFAULT 'natural', -- 'fast', 'natural', 'safe'
  is_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  provider_order_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add engagement_order_item_id to organic_run_schedule for linking runs to engagement items
ALTER TABLE public.organic_run_schedule 
ADD COLUMN IF NOT EXISTS engagement_order_item_id UUID REFERENCES public.engagement_order_items(id) ON DELETE CASCADE;

-- Enable RLS on all new tables
ALTER TABLE public.engagement_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for engagement_bundles (public read, admin write)
CREATE POLICY "Everyone can view active bundles" ON public.engagement_bundles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bundles" ON public.engagement_bundles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bundle_items (public read via bundle, admin write)
CREATE POLICY "Everyone can view bundle items" ON public.bundle_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.engagement_bundles 
      WHERE id = bundle_items.bundle_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage bundle items" ON public.bundle_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for engagement_orders
CREATE POLICY "Users can view own engagement orders" ON public.engagement_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own engagement orders" ON public.engagement_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all engagement orders" ON public.engagement_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for engagement_order_items
CREATE POLICY "Users can view own order items" ON public.engagement_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.engagement_orders 
      WHERE id = engagement_order_items.engagement_order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order items" ON public.engagement_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.engagement_orders 
      WHERE id = engagement_order_items.engagement_order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items" ON public.engagement_order_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update organic_run_schedule RLS to include engagement orders
CREATE POLICY "Users can view own engagement run schedules" ON public.organic_run_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.engagement_order_items eoi
      JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
      WHERE eoi.id = organic_run_schedule.engagement_order_item_id 
      AND eo.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_engagement_bundles_updated_at
  BEFORE UPDATE ON public.engagement_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_engagement_orders_updated_at
  BEFORE UPDATE ON public.engagement_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_engagement_order_items_updated_at
  BEFORE UPDATE ON public.engagement_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();