-- Provider Accounts (multiple API keys per provider)
CREATE TABLE public.provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL,
  name text NOT NULL,
  api_key text NOT NULL,
  api_url text NOT NULL,
  priority int DEFAULT 1,
  is_active bool DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service to Provider Account mapping (many-to-many)
CREATE TABLE public.service_provider_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  provider_account_id uuid REFERENCES public.provider_accounts(id) ON DELETE CASCADE,
  provider_service_id text NOT NULL,
  sort_order int DEFAULT 0,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_id, provider_account_id)
);

-- Track which account was used for each run
ALTER TABLE public.organic_run_schedule 
ADD COLUMN provider_account_id uuid REFERENCES public.provider_accounts(id);

-- Enable RLS
ALTER TABLE public.provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admins can manage provider accounts" ON public.provider_accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage service mappings" ON public.service_provider_mapping
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on provider_accounts
CREATE TRIGGER update_provider_accounts_updated_at
BEFORE UPDATE ON public.provider_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();