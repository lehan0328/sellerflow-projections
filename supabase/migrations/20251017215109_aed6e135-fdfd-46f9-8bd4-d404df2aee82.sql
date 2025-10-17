-- Add follower_count column to affiliates table
ALTER TABLE public.affiliates
ADD COLUMN follower_count INTEGER;

-- Add comment
COMMENT ON COLUMN public.affiliates.follower_count IS 'Number of followers the affiliate has';