-- Migration: Update is_website_admin() to use role system (fixed)

-- Step 1: Allow NULL account_id for website-level admins
ALTER TABLE public.user_roles 
ALTER COLUMN account_id DROP NOT NULL;

-- Step 2: Drop the unique constraint and recreate it to handle NULLs properly
-- First, find and drop existing unique constraint
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_account_id_key;

-- Recreate with proper NULL handling
CREATE UNIQUE INDEX user_roles_user_account_unique 
ON public.user_roles (user_id, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 3: Insert website-level admin roles for the hardcoded emails
INSERT INTO public.user_roles (user_id, account_id, role)
SELECT 
  au.id,
  NULL, -- NULL account_id indicates website-level admin
  'admin'::app_role
FROM auth.users au
WHERE au.email IN ('chuandy914@gmail.com', 'orders@imarand.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = au.id AND ur.account_id IS NULL
  );

-- Step 4: Update is_website_admin() to check user_roles
CREATE OR REPLACE FUNCTION public.is_website_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND account_id IS NULL
      AND role = 'admin'::app_role
  )
$$;

-- Step 5: Update is_admin_staff() to remove hardcoded checks
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_website_admin()
  OR EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND admin_permissions.account_created = true
  )
$$;

COMMENT ON FUNCTION public.is_website_admin IS 
'Checks if user is a website-level admin (account_id IS NULL in user_roles)';

COMMENT ON FUNCTION public.is_admin_staff IS 
'Checks if user is admin staff (website admin or has admin_permissions)';