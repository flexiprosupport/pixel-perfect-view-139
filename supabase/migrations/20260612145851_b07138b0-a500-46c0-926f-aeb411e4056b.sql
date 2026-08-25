ALTER TABLE public.bundle_items
  ADD COLUMN IF NOT EXISTS price_per_k NUMERIC;

COMMENT ON COLUMN public.bundle_items.price_per_k IS
  'Manual per-1000 price in USD for this bundle item. Overrides services.price when an order is placed via this bundle. NULL means fall back to the linked service price.';