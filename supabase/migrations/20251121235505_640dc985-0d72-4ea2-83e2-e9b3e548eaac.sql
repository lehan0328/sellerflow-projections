-- Fix test5@gmail.com account with trial dates
UPDATE profiles
SET 
  trial_start = now(),
  trial_end = now() + interval '168 hours',
  plan_tier = 'professional'
WHERE email = 'test5@gmail.com';

-- Create the missing trigger that calls handle_new_user()
-- This trigger was defined in the migration but never actually created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();