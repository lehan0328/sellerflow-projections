-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index on email for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update the trigger function to also set email from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, account_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.id, -- account_id defaults to user_id for new users
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = NEW.email,
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', profiles.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', profiles.last_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Backfill existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
  AND p.email IS NULL;