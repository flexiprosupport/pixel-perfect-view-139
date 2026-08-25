-- Migration: Add user-level organic settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_organic_mode_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS organic_ratios JSONB DEFAULT '{"views": 100, "likes": 5, "comments": 2, "shares": 1}'::jsonb;

-- Comment on columns for documentation
COMMENT ON COLUMN public.profiles.is_organic_mode_default IS 'Whether the user wants AI Organic Mode enabled by default for all orders';
COMMENT ON COLUMN public.profiles.organic_ratios IS 'Default engagement ratios for the user across different types (percentage values)';
