
-- Give Kevin Galang (kevin@imarand.com) lifetime professional access
UPDATE public.profiles
SET 
  plan_override = 'professional',
  trial_end = '2099-12-31 23:59:59+00'::timestamp with time zone,
  updated_at = now()
WHERE user_id = '8ecf98e9-e833-435d-9967-c711bed5c3d0';
