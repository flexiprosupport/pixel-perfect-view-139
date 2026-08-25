-- Orders: user lookups + status filtering
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Engagement orders: user lookups
CREATE INDEX IF NOT EXISTS idx_engagement_orders_user_id_created ON public.engagement_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_orders_status ON public.engagement_orders(status);

-- Engagement order items: parent lookup
CREATE INDEX IF NOT EXISTS idx_engagement_order_items_order_id ON public.engagement_order_items(engagement_order_id);
CREATE INDEX IF NOT EXISTS idx_engagement_order_items_status ON public.engagement_order_items(status);

-- Organic run schedule: critical for cron job performance
CREATE INDEX IF NOT EXISTS idx_organic_runs_status_scheduled ON public.organic_run_schedule(status, scheduled_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_organic_runs_started ON public.organic_run_schedule(status, provider_order_id) WHERE status = 'started';
CREATE INDEX IF NOT EXISTS idx_organic_runs_order_id ON public.organic_run_schedule(order_id);
CREATE INDEX IF NOT EXISTS idx_organic_runs_item_id ON public.organic_run_schedule(engagement_order_item_id);

-- Transactions: user history
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);

-- Deposits: user + status
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON public.deposits(user_id, status);

-- Services: active services query
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active) WHERE is_active = true;

-- Provider mappings: service lookup
CREATE INDEX IF NOT EXISTS idx_spm_service_active ON public.service_provider_mapping(service_id, is_active) WHERE is_active = true;

-- Wallets: user lookup (critical path)
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Profiles: user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- User roles: user lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Chat: conversation lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON public.chat_conversations(user_id);

-- Support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);