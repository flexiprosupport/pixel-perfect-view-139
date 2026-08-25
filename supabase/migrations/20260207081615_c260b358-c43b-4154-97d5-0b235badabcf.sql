-- Drop existing constraint and add CASCADE delete for bundle_items -> services
ALTER TABLE public.bundle_items
  DROP CONSTRAINT IF EXISTS bundle_items_service_id_fkey;

ALTER TABLE public.bundle_items
  ADD CONSTRAINT bundle_items_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;