ALTER TABLE public.provider_accounts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_accounts;