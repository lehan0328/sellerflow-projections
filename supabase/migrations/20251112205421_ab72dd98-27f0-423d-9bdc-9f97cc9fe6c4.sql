-- Migrate existing user referral codes from profiles to referral_codes table
INSERT INTO public.referral_codes (code, code_type, owner_id, discount_percentage, duration_months, is_active, created_at)
SELECT DISTINCT
  UPPER(p.my_referral_code) as code,
  'user' as code_type,
  p.user_id as owner_id,
  10 as discount_percentage,
  3 as duration_months,
  true as is_active,
  p.created_at
FROM public.profiles p
WHERE p.my_referral_code IS NOT NULL 
  AND p.my_referral_code != ''
  AND UPPER(p.my_referral_code) NOT IN (SELECT code FROM public.referral_codes)
ON CONFLICT (code) DO NOTHING;