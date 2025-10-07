-- Add trial tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone;

-- Update the handle_new_user function to set trial dates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    trial_start,
    trial_end
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    now(),
    now() + interval '168 hours'  -- 7 days = 168 hours
  );
  RETURN NEW;
END;
$function$;