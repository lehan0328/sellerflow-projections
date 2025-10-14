-- Fix missing user roles by adding a trigger and backfilling existing users

-- First, create or replace the trigger function to assign owner role on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create owner role using the account_id from the NEW profile record
  IF NEW.account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.user_id, NEW.account_id, 'owner'::app_role)
    ON CONFLICT (user_id, account_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

-- Create trigger to automatically assign owner role when profile is created
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill existing users who don't have roles
INSERT INTO public.user_roles (user_id, account_id, role)
SELECT p.user_id, p.account_id, 'owner'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.account_id = p.account_id
WHERE ur.user_id IS NULL
  AND p.account_id IS NOT NULL
ON CONFLICT (user_id, account_id) DO NOTHING;