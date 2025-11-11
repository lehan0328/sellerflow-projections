-- Create a security definer function to check if user is admin staff
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user is a website admin (hardcoded)
  SELECT (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('chuandy914@gmail.com', 'orders@imarand.com')
  )
  OR
  -- Check if user has admin permissions
  EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_permissions.account_created = true
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can create ticket messages" ON public.ticket_messages;

-- Create new simpler policies using the function
CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets
FOR SELECT
USING (is_admin_staff());

CREATE POLICY "Admins can update all support tickets"
ON public.support_tickets
FOR UPDATE
USING (is_admin_staff());

CREATE POLICY "Admins can delete support tickets"
ON public.support_tickets
FOR DELETE
USING (is_admin_staff());

CREATE POLICY "Admins can view all ticket messages"
ON public.ticket_messages
FOR SELECT
USING (is_admin_staff());

CREATE POLICY "Admins can create ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (is_admin_staff());