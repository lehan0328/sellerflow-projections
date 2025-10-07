-- Add unique constraint to user_roles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_account_id_key'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_account_id_key UNIQUE (user_id, account_id);
  END IF;
END $$;

-- Ensure all existing account owners have the 'owner' role in user_roles
INSERT INTO public.user_roles (user_id, account_id, role)
SELECT 
  p.user_id,
  p.account_id,
  'owner'::app_role
FROM public.profiles p
WHERE p.is_account_owner = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id 
      AND ur.account_id = p.account_id
  )
ON CONFLICT (user_id, account_id) DO NOTHING;

-- Create or replace the trigger function to handle new user roles
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Get the account_id from profiles
  SELECT account_id INTO v_account_id
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Create owner role for account owner
  IF v_account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.user_id, v_account_id, 'owner'::app_role)
    ON CONFLICT (user_id, account_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create trigger on profiles table (fires after profile is created/updated)
CREATE TRIGGER on_profile_created
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.is_account_owner = true)
  EXECUTE FUNCTION public.handle_new_user_role();