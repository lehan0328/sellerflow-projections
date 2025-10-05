-- Add column to track if user has ever redeemed a discount
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS discount_redeemed_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.profiles.discount_redeemed_at IS 'Tracks when the user first redeemed the retention discount (null if never redeemed)';