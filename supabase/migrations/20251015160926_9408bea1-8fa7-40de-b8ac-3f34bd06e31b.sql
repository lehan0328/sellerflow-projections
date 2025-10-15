-- Add RLS policy for website admin to view all profiles
-- This allows the website admin (chuandy914@gmail.com) to view all user profiles in the admin dashboard

CREATE POLICY "Website admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'chuandy914@gmail.com'
  )
);