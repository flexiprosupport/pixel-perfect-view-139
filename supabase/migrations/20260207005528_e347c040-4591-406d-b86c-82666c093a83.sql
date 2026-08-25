-- Add AI Organic Mode setting to engagement bundles
-- When enabled, AI automatically generates unique organic patterns for each order

ALTER TABLE public.engagement_bundles 
ADD COLUMN IF NOT EXISTS ai_organic_enabled boolean DEFAULT true;

-- Add a comment for clarity
COMMENT ON COLUMN public.engagement_bundles.ai_organic_enabled IS 'When ON, AI generates unique organic delivery patterns for each order automatically';