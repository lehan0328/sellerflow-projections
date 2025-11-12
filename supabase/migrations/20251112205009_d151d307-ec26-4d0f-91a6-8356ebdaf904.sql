-- Migrate any existing custom_discount_codes to referral_codes table
INSERT INTO public.referral_codes (code, code_type, discount_percentage, duration_months, is_active, created_at)
SELECT 
  code,
  'custom' as code_type,
  discount_percentage,
  duration_months,
  is_active,
  created_at
FROM public.custom_discount_codes
WHERE code NOT IN (SELECT code FROM public.referral_codes)
ON CONFLICT (code) DO NOTHING;