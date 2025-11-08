-- Update the is_website_admin function to check for multiple admin emails
CREATE OR REPLACE FUNCTION public.is_website_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('chuandy914@gmail.com', 'orders@imarand.com')
  )
$function$;