-- Enable realtime for wallets table so balance updates are broadcasted instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;