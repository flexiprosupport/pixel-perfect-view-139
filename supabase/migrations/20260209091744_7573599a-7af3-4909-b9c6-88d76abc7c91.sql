-- Add public read access for services and bundles (these are meant to be public)

-- Services table - everyone can view active services
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);

-- Admin can manage services
DROP POLICY IF EXISTS "Admin can manage services" ON public.services;
CREATE POLICY "Admin can manage all services" ON public.services FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Engagement bundles - everyone can view active bundles
DROP POLICY IF EXISTS "Anyone can view active bundles" ON public.engagement_bundles;
CREATE POLICY "Anyone can view active bundles" ON public.engagement_bundles FOR SELECT USING (is_active = true);

-- Admin can manage bundles
DROP POLICY IF EXISTS "Admin can manage bundles" ON public.engagement_bundles;
CREATE POLICY "Admin can manage all bundles" ON public.engagement_bundles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bundle items - everyone can view
DROP POLICY IF EXISTS "Anyone can view bundle items" ON public.bundle_items;
CREATE POLICY "Anyone can view bundle items" ON public.bundle_items FOR SELECT USING (true);

-- Admin can manage bundle items
DROP POLICY IF EXISTS "Admin can manage bundle items" ON public.bundle_items;
CREATE POLICY "Admin can manage all bundle items" ON public.bundle_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Service provider mapping - admin only (contains sensitive provider info)
DROP POLICY IF EXISTS "Admin can manage service mappings" ON public.service_provider_mapping;
CREATE POLICY "Admin only service provider mapping" ON public.service_provider_mapping FOR ALL USING (public.has_role(auth.uid(), 'admin'));