INSERT INTO public.platform_settings (maintenance_mode)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='platform_settings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings';
  END IF;
END $$;