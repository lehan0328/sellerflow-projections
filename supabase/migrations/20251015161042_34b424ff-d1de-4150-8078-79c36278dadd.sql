-- Drop the problematic policy
DROP POLICY IF EXISTS "Website admin can view all profiles" ON public.profiles;

-- Create a security definer function to check if user is website admin
CREATE OR REPLACE FUNCTION public.is_website_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'chuandy914@gmail.com'
  )
$$;

-- Create the correct policy using the security definer function
CREATE POLICY "Website admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_website_admin());