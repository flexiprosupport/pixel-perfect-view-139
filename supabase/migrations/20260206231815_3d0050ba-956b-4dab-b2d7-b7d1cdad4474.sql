-- Add column for custom ratio mode to engagement_bundles
ALTER TABLE public.engagement_bundles 
ADD COLUMN IF NOT EXISTS use_custom_ratios boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.engagement_bundles.use_custom_ratios IS 'When true, uses admin-defined ratios. When false, uses AI-calculated organic ratios.';
