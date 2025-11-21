-- Add partial unique index for non-NULL account_id cases (allows ON CONFLICT to work)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_account_id_unique 
ON public.user_roles (user_id, account_id) 
WHERE account_id IS NOT NULL;

-- Update the handle_new_user_role function to use the partial unique constraint
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create owner role using the account_id from the NEW profile record
  IF NEW.account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.user_id, NEW.account_id, 'owner'::app_role)
    ON CONFLICT (user_id, account_id) WHERE account_id IS NOT NULL DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;