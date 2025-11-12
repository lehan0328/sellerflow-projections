-- Clear ALL auto-migrated codes - users should manually generate them
DELETE FROM public.referral_codes WHERE code_type = 'user';

-- Keep only affiliate codes (those are business relationships)
-- User referral codes should ONLY be created when users click "Generate Referral Code"