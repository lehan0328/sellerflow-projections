-- Fix affiliate code discount values
-- Affiliates should be 10% off for 3 months, not 30% for 12 months
UPDATE public.referral_codes
SET 
  discount_percentage = 10,
  duration_months = 3
WHERE code_type = 'affiliate';