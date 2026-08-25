
-- =============================================
-- PERFORMANCE INDEXES FOR 10,000+ CONCURRENT USERS
-- =============================================

-- Orders: Most frequently queried table
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_is_organic ON public.orders(is_organic_mode) WHERE is_organic_mode = true;

-- Organic Run Schedule: Heavy read/write during cron execution
CREATE INDEX IF NOT EXISTS idx_organic_runs_order_status ON public.organic_run_schedule(order_id, status);
CREATE INDEX IF NOT EXISTS idx_organic_runs_status_scheduled ON public.organic_run_schedule(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_organic_runs_started ON public.organic_run_schedule(status) WHERE status = 'started';
CREATE INDEX IF NOT EXISTS idx_organic_runs_engagement_item ON public.organic_run_schedule(engagement_order_item_id);

-- Transactions: Wallet history lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Wallets: Balance lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Profiles: Auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Engagement Orders
CREATE INDEX IF NOT EXISTS idx_engagement_orders_user ON public.engagement_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_orders_status ON public.engagement_orders(status);
CREATE INDEX IF NOT EXISTS idx_engagement_order_items_order ON public.engagement_order_items(engagement_order_id);
CREATE INDEX IF NOT EXISTS idx_engagement_order_items_status ON public.engagement_order_items(status);

-- Services: Browsing
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);

-- Subscriptions: Auth guard checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- User Roles: Permission checks (called on every request)
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);

-- Chat: Real-time lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);

-- Service Provider Mapping
CREATE INDEX IF NOT EXISTS idx_spm_service ON public.service_provider_mapping(service_id) WHERE is_active = true;

-- Support Tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
