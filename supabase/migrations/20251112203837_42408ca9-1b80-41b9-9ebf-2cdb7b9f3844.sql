-- Add missing columns to referral_codes table
ALTER TABLE public.referral_codes 
  ADD COLUMN IF NOT EXISTS code_type text,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS discount_percentage integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS duration_months integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add constraint for code_type
ALTER TABLE public.referral_codes 
  DROP CONSTRAINT IF EXISTS valid_code_type;

ALTER TABLE public.referral_codes 
  ADD CONSTRAINT valid_code_type CHECK (code_type IN ('user', 'affiliate', 'custom'));

-- Migrate user_id to owner_id for existing records
UPDATE public.referral_codes 
SET owner_id = user_id 
WHERE owner_id IS NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON public.referral_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON public.referral_codes(is_active);