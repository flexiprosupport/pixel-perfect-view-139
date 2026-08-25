-- Clean up duplicate RLS policies to prevent conflicts

-- bundle_items - remove duplicates
DROP POLICY IF EXISTS "Admins can manage bundle items" ON public.bundle_items;
DROP POLICY IF EXISTS "Everyone can view bundle items" ON public.bundle_items;

-- engagement_bundles - remove duplicates  
DROP POLICY IF EXISTS "Admins can manage bundles" ON public.engagement_bundles;
DROP POLICY IF EXISTS "Everyone can view active bundles" ON public.engagement_bundles;

-- services - remove duplicates
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Everyone can view active services" ON public.services;

-- chat_conversations - remove duplicates
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chat_conversations;

-- chat_messages - remove duplicate
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;

-- engagement_order_items - remove duplicate
DROP POLICY IF EXISTS "Users can view own order items" ON public.engagement_order_items;

-- organic_run_schedule - remove duplicates
DROP POLICY IF EXISTS "Users can view own order runs" ON public.organic_run_schedule;
DROP POLICY IF EXISTS "Users can view own engagement run schedules" ON public.organic_run_schedule;

-- user_roles - remove duplicate
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- service_provider_mapping - remove duplicate
DROP POLICY IF EXISTS "Admins can manage service mappings" ON public.service_provider_mapping;

-- providers - remove duplicate
DROP POLICY IF EXISTS "Admins can view all provider details" ON public.providers;