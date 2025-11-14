-- Add usage tracking columns to referral_codes table
ALTER TABLE public.referral_codes 
ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone DEFAULT NULL;

-- Add constraints
ALTER TABLE public.referral_codes 
ADD CONSTRAINT check_current_uses_non_negative CHECK (current_uses >= 0);

ALTER TABLE public.referral_codes 
ADD CONSTRAINT check_max_uses_positive CHECK (max_uses IS NULL OR max_uses >= 1);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_usage 
ON public.referral_codes(code, is_active, max_uses, current_uses);

-- Add comments for clarity
COMMENT ON COLUMN public.referral_codes.max_uses IS 'Maximum number of times this code can be redeemed. NULL means unlimited.';
COMMENT ON COLUMN public.referral_codes.current_uses IS 'Number of times this code has been successfully redeemed.';