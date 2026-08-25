CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);
CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_email text,
    target_user_id uuid,
    target_email text,
    action text NOT NULL,
    amount_usd numeric,
    amount_inr numeric,
    notes text,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_id uuid NOT NULL,
    service_id uuid,
    engagement_type text NOT NULL,
    ratio_percent numeric DEFAULT 100,
    is_base boolean DEFAULT false,
    default_drip_qty_per_run integer DEFAULT 500,
    default_drip_interval integer DEFAULT 1,
    default_drip_interval_unit text DEFAULT 'hours'::text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    price_per_k numeric
);
ALTER TABLE ONLY public.bundle_items REPLICA IDENTITY FULL;
COMMENT ON COLUMN public.bundle_items.price_per_k IS 'Manual per-1000 price in USD for this bundle item. Overrides services.price when an order is placed via this bundle. NULL means fall back to the linked service price.';
CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    user_name text,
    status text DEFAULT 'open'::text NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_conversations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);
CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['user'::text, 'admin'::text])))
);
CREATE TABLE public.deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'USDT'::text,
    payment_method text DEFAULT 'usdt'::text,
    proof_url text,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT deposits_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);
CREATE TABLE public.engagement_bundles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    platform text NOT NULL,
    provider_id text,
    description text,
    icon text DEFAULT 'rocket'::text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    use_custom_ratios boolean DEFAULT false,
    ai_organic_enabled boolean DEFAULT true
);
ALTER TABLE ONLY public.engagement_bundles REPLICA IDENTITY FULL;
COMMENT ON COLUMN public.engagement_bundles.use_custom_ratios IS 'When true, uses admin-defined ratios. When false, uses AI-calculated organic ratios.';
COMMENT ON COLUMN public.engagement_bundles.ai_organic_enabled IS 'When ON, AI generates unique organic delivery patterns for each order automatically';
CREATE TABLE public.engagement_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    engagement_order_id uuid NOT NULL,
    engagement_type text NOT NULL,
    service_id uuid,
    quantity integer NOT NULL,
    price numeric NOT NULL,
    drip_qty_per_run integer,
    drip_interval integer,
    drip_interval_unit text DEFAULT 'hours'::text,
    speed_preset text DEFAULT 'natural'::text,
    is_enabled boolean DEFAULT true,
    status text DEFAULT 'pending'::text,
    provider_order_id text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    start_count bigint,
    current_count bigint,
    target_count bigint,
    delivered_count bigint DEFAULT 0 NOT NULL,
    remaining_count bigint DEFAULT 0 NOT NULL,
    progress_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    last_synced_at timestamp with time zone,
    max_observed_count bigint,
    completion_locked_at timestamp with time zone
);
CREATE TABLE public.engagement_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number integer NOT NULL,
    user_id uuid NOT NULL,
    bundle_id uuid,
    link text NOT NULL,
    base_quantity integer NOT NULL,
    total_price numeric NOT NULL,
    is_organic_mode boolean DEFAULT true,
    variance_percent integer DEFAULT 25,
    peak_hours_enabled boolean DEFAULT true,
    status text DEFAULT 'pending'::text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);
CREATE SEQUENCE public.engagement_orders_order_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.engagement_orders_order_number_seq OWNED BY public.engagement_orders.order_number;
CREATE TABLE public.internal_cron_tokens (
    name text NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number integer NOT NULL,
    user_id uuid NOT NULL,
    service_id uuid,
    link text NOT NULL,
    quantity integer NOT NULL,
    price numeric NOT NULL,
    status text DEFAULT 'pending'::text,
    start_count integer,
    remains integer,
    provider_order_id text,
    is_drip_feed boolean DEFAULT false,
    drip_runs integer,
    drip_interval integer,
    drip_interval_unit text,
    drip_quantity_per_run integer,
    is_organic_mode boolean DEFAULT false,
    variance_percent integer DEFAULT 25,
    peak_hours_enabled boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    current_count bigint,
    target_count bigint,
    delivered_count bigint DEFAULT 0,
    remaining_count bigint,
    progress_percentage numeric(5,2) DEFAULT 0,
    last_synced_at timestamp with time zone,
    max_observed_count bigint,
    completion_locked_at timestamp with time zone
);
CREATE SEQUENCE public.orders_order_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;
CREATE TABLE public.organic_run_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    run_number integer NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    quantity_to_send integer NOT NULL,
    base_quantity integer NOT NULL,
    variance_applied integer DEFAULT 0,
    peak_multiplier numeric DEFAULT 1.0,
    status text DEFAULT 'pending'::text,
    provider_order_id text,
    provider_response jsonb,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    engagement_order_item_id uuid,
    provider_start_count integer,
    provider_remains integer,
    provider_status text,
    provider_charge numeric,
    last_status_check timestamp with time zone,
    retry_count integer DEFAULT 0,
    provider_account_id uuid,
    provider_account_name text,
    rotation_lock_key text
);
ALTER TABLE ONLY public.organic_run_schedule REPLICA IDENTITY FULL;
COMMENT ON COLUMN public.organic_run_schedule.provider_start_count IS 'Initial count from provider when order started';
COMMENT ON COLUMN public.organic_run_schedule.provider_remains IS 'Remaining quantity to deliver from provider';
COMMENT ON COLUMN public.organic_run_schedule.provider_status IS 'Current status from provider (Pending, In progress, Processing, Completed, etc.)';
COMMENT ON COLUMN public.organic_run_schedule.provider_charge IS 'Actual charge from provider for this run';
COMMENT ON COLUMN public.organic_run_schedule.last_status_check IS 'Last time provider status was checked';
COMMENT ON COLUMN public.organic_run_schedule.retry_count IS 'Number of times this run has been automatically retried after failure';
CREATE TABLE public.oxapay_deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text NOT NULL,
    track_id text,
    user_id uuid NOT NULL,
    amount_usd numeric(14,4) NOT NULL,
    amount_inr numeric(14,2) NOT NULL,
    pay_currency text,
    status text DEFAULT 'waiting'::text NOT NULL,
    credited boolean DEFAULT false NOT NULL,
    payment_url text,
    raw_payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT oxapay_deposits_amount_inr_check CHECK ((amount_inr > (0)::numeric)),
    CONSTRAINT oxapay_deposits_amount_usd_check CHECK ((amount_usd > (0)::numeric))
);
CREATE TABLE public.oxapay_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_hash text NOT NULL,
    order_id text,
    track_id text,
    status text,
    signature_valid boolean DEFAULT false NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    source_ip text,
    payload jsonb,
    credit_result jsonb,
    notes text,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    tx_hash text,
    pay_currency text,
    expected_amount numeric(14,4),
    received_amount numeric(18,8),
    amount_match boolean,
    http_method text,
    headers jsonb,
    user_agent text,
    signature_expected text,
    signature_received text,
    raw_body text
);
CREATE TABLE public.platform_settings (
    id text DEFAULT 'global'::text NOT NULL,
    global_markup_percent numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    maintenance_mode boolean DEFAULT false NOT NULL
);
CREATE TABLE public.popup_ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    youtube_video_id text DEFAULT ''::text NOT NULL,
    title text DEFAULT 'Watch this video'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    skip_after_seconds integer DEFAULT 5 NOT NULL,
    last_force_trigger timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    video_layout text DEFAULT 'auto'::text NOT NULL,
    CONSTRAINT popup_ads_video_layout_check CHECK ((video_layout = ANY (ARRAY['auto'::text, 'landscape'::text, 'portrait'::text])))
);
CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    full_name text,
    api_key text,
    currency text DEFAULT 'USD'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    telegram_id text,
    telegram_username text,
    is_organic_mode_default boolean DEFAULT false,
    organic_ratios jsonb DEFAULT '{"likes": 5, "views": 100, "shares": 1, "comments": 2}'::jsonb,
    avatar_url text,
    is_banned boolean DEFAULT false NOT NULL,
    banned_reason text,
    banned_at timestamp with time zone
);
COMMENT ON COLUMN public.profiles.is_organic_mode_default IS 'Whether the user wants AI Organic Mode enabled by default for all orders';
COMMENT ON COLUMN public.profiles.organic_ratios IS 'Default engagement ratios for the user across different types (percentage values)';
CREATE TABLE public.provider_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id text NOT NULL,
    name text NOT NULL,
    api_key text NOT NULL,
    api_url text NOT NULL,
    priority integer DEFAULT 1,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    balance numeric,
    balance_currency text,
    balance_checked_at timestamp with time zone,
    low_balance_threshold numeric DEFAULT 10 NOT NULL,
    last_low_balance_alert_at timestamp with time zone,
    last_balance_error text,
    delivery_multiplier numeric DEFAULT 1.0 NOT NULL,
    cooldown_until timestamp with time zone,
    last_error text,
    last_error_at timestamp with time zone
);
ALTER TABLE ONLY public.provider_accounts REPLICA IDENTITY FULL;
COMMENT ON COLUMN public.provider_accounts.delivery_multiplier IS 'How much extra the provider delivers vs ordered qty. e.g. 2.0 means provider delivers 2x ordered (we will divide scheduled qty by this before sending). Min 0.5, default 1.0';
CREATE TABLE public.providers (
    id text NOT NULL,
    name text NOT NULL,
    api_url text NOT NULL,
    api_key text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE VIEW public.providers_public WITH (security_invoker='on') AS
 SELECT id,
    name,
    api_url,
    is_active,
    created_at,
    updated_at
   FROM public.providers
  WHERE (is_active = true);
CREATE TABLE public.razorpay_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    event_type text,
    payment_id text,
    payload jsonb,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.rotation_alert_state (
    alert_key text NOT NULL,
    last_count integer DEFAULT 0 NOT NULL,
    last_alerted_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);
CREATE TABLE public.service_provider_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid,
    provider_account_id uuid,
    provider_service_id text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id text,
    provider_service_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    price numeric DEFAULT 0 NOT NULL,
    min_quantity integer DEFAULT 10 NOT NULL,
    max_quantity integer DEFAULT 100000 NOT NULL,
    speed text DEFAULT 'medium'::text,
    quality text DEFAULT 'standard'::text,
    drip_feed_enabled boolean DEFAULT false,
    is_active boolean DEFAULT true,
    start_time text,
    refill text,
    cancel_allowed text,
    drop_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ONLY public.services REPLICA IDENTITY FULL;
CREATE TABLE public.subscription_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    plan_type text NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscription_requests_plan_type_check CHECK ((plan_type = ANY (ARRAY['monthly'::text, 'lifetime'::text]))),
    CONSTRAINT subscription_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_type text DEFAULT 'none'::text NOT NULL,
    status text DEFAULT 'inactive'::text NOT NULL,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    activated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_plan_type_check CHECK ((plan_type = ANY (ARRAY['none'::text, 'monthly'::text, 'lifetime'::text, 'trial'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['inactive'::text, 'active'::text, 'expired'::text, 'cancelled'::text])))
);
CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    category text DEFAULT 'other'::text,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'open'::text,
    order_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    balance_after numeric NOT NULL,
    order_id uuid,
    description text,
    payment_method text,
    payment_reference text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
CREATE VIEW public.v_orders_missing_debit WITH (security_invoker='on') AS
 WITH all_orders AS (
         SELECT orders.id,
            orders.user_id,
            orders.price AS amt,
            orders.created_at,
            'order'::text AS kind,
            orders.order_number
           FROM public.orders
          WHERE (orders.status <> 'cancelled'::text)
        UNION ALL
         SELECT engagement_orders.id,
            engagement_orders.user_id,
            engagement_orders.total_price,
            engagement_orders.created_at,
            'engagement'::text,
            engagement_orders.order_number
           FROM public.engagement_orders
          WHERE (engagement_orders.status <> 'cancelled'::text)
        )
 SELECT id,
    user_id,
    kind,
    order_number,
    amt,
    created_at
   FROM all_orders o
  WHERE ((created_at > '2026-06-20 00:00:00+00'::timestamp with time zone) AND (NOT (EXISTS ( SELECT 1
           FROM public.transactions t
          WHERE ((t.user_id = o.user_id) AND (t.type = ANY (ARRAY['order_payment'::text, 'order'::text])) AND ((t.created_at >= (o.created_at - '00:05:00'::interval)) AND (t.created_at <= (o.created_at + '00:05:00'::interval))) AND (abs((abs(t.amount) - o.amt)) < 0.01))))));
CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    balance numeric DEFAULT 0,
    total_deposited numeric DEFAULT 0,
    total_spent numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    profile_id uuid
);
CREATE TABLE public.zapupi_deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id text NOT NULL,
    amount_inr numeric NOT NULL,
    amount_usd numeric,
    status text DEFAULT 'pending'::text NOT NULL,
    credited boolean DEFAULT false NOT NULL,
    txn_id text,
    utr text,
    payment_url text,
    gateway_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zapupi_deposits_amount_inr_check CHECK ((amount_inr > (0)::numeric))
);
CREATE TABLE public.zapupi_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key text NOT NULL,
    order_id text NOT NULL,
    txn_id text,
    utr text,
    status text,
    source text DEFAULT 'webhook'::text NOT NULL,
    payload jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    expected_amount numeric,
    received_amount numeric,
    amount_match boolean,
    http_method text,
    headers jsonb,
    source_ip text,
    user_agent text,
    verification_notes text,
    processed boolean DEFAULT false,
    credit_result jsonb,
    raw_body text
);
ALTER TABLE ONLY public.engagement_orders ALTER COLUMN order_number SET DEFAULT nextval('public.engagement_orders_order_number_seq'::regclass);
ALTER TABLE ONLY public.orders ALTER COLUMN order_number SET DEFAULT nextval('public.orders_order_number_seq'::regclass);
ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.engagement_bundles
    ADD CONSTRAINT engagement_bundles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.engagement_order_items
    ADD CONSTRAINT engagement_order_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.engagement_orders
    ADD CONSTRAINT engagement_orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.internal_cron_tokens
    ADD CONSTRAINT internal_cron_tokens_pkey PRIMARY KEY (name);
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.organic_run_schedule
    ADD CONSTRAINT organic_run_schedule_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oxapay_deposits
    ADD CONSTRAINT oxapay_deposits_order_id_key UNIQUE (order_id);
ALTER TABLE ONLY public.oxapay_deposits
    ADD CONSTRAINT oxapay_deposits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oxapay_webhook_events
    ADD CONSTRAINT oxapay_webhook_events_event_hash_key UNIQUE (event_hash);
ALTER TABLE ONLY public.oxapay_webhook_events
    ADD CONSTRAINT oxapay_webhook_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.popup_ads
    ADD CONSTRAINT popup_ads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_telegram_id_key UNIQUE (telegram_id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT provider_accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.razorpay_webhook_events
    ADD CONSTRAINT razorpay_webhook_events_event_id_key UNIQUE (event_id);
ALTER TABLE ONLY public.razorpay_webhook_events
    ADD CONSTRAINT razorpay_webhook_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.rotation_alert_state
    ADD CONSTRAINT rotation_alert_state_pkey PRIMARY KEY (alert_key);
ALTER TABLE ONLY public.service_provider_mapping
    ADD CONSTRAINT service_provider_mapping_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.service_provider_mapping
    ADD CONSTRAINT service_provider_mapping_service_id_provider_account_id_key UNIQUE (service_id, provider_account_id);
ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscription_requests
    ADD CONSTRAINT subscription_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.zapupi_deposits
    ADD CONSTRAINT zapupi_deposits_order_id_key UNIQUE (order_id);
ALTER TABLE ONLY public.zapupi_deposits
    ADD CONSTRAINT zapupi_deposits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.zapupi_webhook_events
    ADD CONSTRAINT zapupi_webhook_events_event_key_key UNIQUE (event_key);
ALTER TABLE ONLY public.zapupi_webhook_events
    ADD CONSTRAINT zapupi_webhook_events_pkey PRIMARY KEY (id);
CREATE INDEX idx_admin_audit_log_actor ON public.admin_audit_log USING btree (actor_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log USING btree (target_user_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations USING btree (status);
CREATE INDEX idx_chat_conversations_user ON public.chat_conversations USING btree (user_id);
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations USING btree (user_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at DESC);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);
CREATE INDEX idx_deposits_user_status ON public.deposits USING btree (user_id, status);
CREATE INDEX idx_engagement_order_items_order ON public.engagement_order_items USING btree (engagement_order_id);
CREATE INDEX idx_engagement_order_items_order_id ON public.engagement_order_items USING btree (engagement_order_id);
CREATE INDEX idx_engagement_order_items_status ON public.engagement_order_items USING btree (status);
CREATE INDEX idx_engagement_order_items_tracking_watch ON public.engagement_order_items USING btree (status, engagement_order_id) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text]));
CREATE INDEX idx_engagement_orders_status ON public.engagement_orders USING btree (status);
CREATE INDEX idx_engagement_orders_status_user_id ON public.engagement_orders USING btree (status, user_id);