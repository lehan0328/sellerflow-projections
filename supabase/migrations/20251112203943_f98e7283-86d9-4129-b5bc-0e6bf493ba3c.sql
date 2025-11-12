-- Drop old policies that depend on user_id
DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can create their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can update their own referral codes" ON public.referral_codes;

-- Drop the old user_id column
ALTER TABLE public.referral_codes DROP COLUMN IF EXISTS user_id CASCADE;

-- Clear and repopulate with proper structure
DELETE FROM public.referral_codes;

-- Migrate user referral codes from profiles
INSERT INTO public.referral_codes (code, code_type, owner_id, discount_percentage, duration_months, is_active, created_at)
SELECT 
  UPPER(my_referral_code) as code,
  'user' as code_type,
  user_id as owner_id,
  10 as discount_percentage,
  3 as duration_months,
  true as is_active,
  created_at
FROM public.profiles
WHERE my_referral_code IS NOT NULL AND my_referral_code != ''
ON CONFLICT (code) DO NOTHING;

-- Migrate affiliate codes
INSERT INTO public.referral_codes (code, code_type, owner_id, discount_percentage, duration_months, is_active, created_at)
SELECT 
  UPPER(affiliate_code) as code,
  'affiliate' as code_type,
  user_id as owner_id,
  30 as discount_percentage,
  12 as duration_months,
  CASE WHEN status = 'approved' THEN true ELSE false END as is_active,
  created_at
FROM public.affiliates
WHERE affiliate_code IS NOT NULL AND affiliate_code != ''
ON CONFLICT (code) DO NOTHING;