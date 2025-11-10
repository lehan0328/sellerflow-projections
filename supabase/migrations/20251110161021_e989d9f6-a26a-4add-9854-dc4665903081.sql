-- Add signup tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS hear_about_us TEXT,
ADD COLUMN IF NOT EXISTS monthly_amazon_revenue TEXT;

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_hear_about_us ON public.profiles(hear_about_us);
CREATE INDEX IF NOT EXISTS idx_profiles_monthly_amazon_revenue ON public.profiles(monthly_amazon_revenue);

-- Update the handle_new_user trigger to include these fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, account_id, first_name, last_name, email, referral_code, hear_about_us, monthly_amazon_revenue)
  VALUES (
    NEW.id,
    NEW.id, -- account_id defaults to user_id for new users
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'referral_code',
    NEW.raw_user_meta_data->>'hear_about_us',
    NEW.raw_user_meta_data->>'monthly_amazon_revenue'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = NEW.email,
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', profiles.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', profiles.last_name),
    referral_code = COALESCE(NEW.raw_user_meta_data->>'referral_code', profiles.referral_code),
    hear_about_us = COALESCE(NEW.raw_user_meta_data->>'hear_about_us', profiles.hear_about_us),
    monthly_amazon_revenue = COALESCE(NEW.raw_user_meta_data->>'monthly_amazon_revenue', profiles.monthly_amazon_revenue),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Backfill existing profiles with data from auth.users metadata
UPDATE public.profiles p
SET 
  referral_code = au.raw_user_meta_data->>'referral_code',
  hear_about_us = au.raw_user_meta_data->>'hear_about_us',
  monthly_amazon_revenue = au.raw_user_meta_data->>'monthly_amazon_revenue'
FROM auth.users au
WHERE p.user_id = au.id
  AND (p.referral_code IS NULL OR p.hear_about_us IS NULL OR p.monthly_amazon_revenue IS NULL);