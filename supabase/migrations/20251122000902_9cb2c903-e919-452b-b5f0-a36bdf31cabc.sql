-- COMPLETE FIX: Update handle_new_user() function to set ALL fields including trial dates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    referral_code,
    trial_start,
    trial_end,
    plan_tier
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'monthly_amazon_revenue',
    NEW.raw_user_meta_data ->> 'hear_about_us',
    NEW.raw_user_meta_data ->> 'referral_code',
    now(),
    now() + interval '168 hours',
    'professional'
  );
  RETURN NEW;
END;
$$;

-- Create the trigger using EXECUTE PROCEDURE syntax
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();

-- Backfill test5, test6, test7 with trial dates and signup data from auth.users metadata
UPDATE profiles p
SET
  company = (SELECT raw_user_meta_data->>'company' FROM auth.users WHERE id = p.user_id),
  monthly_amazon_revenue = (SELECT raw_user_meta_data->>'monthly_amazon_revenue' FROM auth.users WHERE id = p.user_id),
  hear_about_us = (SELECT raw_user_meta_data->>'hear_about_us' FROM auth.users WHERE id = p.user_id),
  referral_code = (SELECT raw_user_meta_data->>'referral_code' FROM auth.users WHERE id = p.user_id),
  trial_start = now(),
  trial_end = now() + interval '168 hours',
  plan_tier = 'professional'
WHERE email IN ('test5@gmail.com', 'test6@gmail.com', 'test7@gmail.com');