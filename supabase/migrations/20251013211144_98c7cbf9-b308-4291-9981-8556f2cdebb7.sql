-- Add timestamp tracking for reserve amount changes
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS reserve_last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_settings_reserve_updated 
ON public.user_settings(reserve_last_updated_at);