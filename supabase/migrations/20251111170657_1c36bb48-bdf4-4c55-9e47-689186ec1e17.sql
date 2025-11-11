-- Drop old RLS policies that check profiles.is_admin
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can create ticket messages" ON public.ticket_messages;

-- Create new RLS policies that check admin_permissions table
CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_permissions.account_created = true
  )
  OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('chuandy914@gmail.com', 'orders@imarand.com')
);

CREATE POLICY "Admins can update all support tickets"
ON public.support_tickets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_permissions.account_created = true
  )
  OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('chuandy914@gmail.com', 'orders@imarand.com')
);

CREATE POLICY "Admins can delete support tickets"
ON public.support_tickets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_permissions.account_created = true
  )
  OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('chuandy914@gmail.com', 'orders@imarand.com')
);

CREATE POLICY "Admins can view all ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_permissions.account_created = true
  )
  OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('chuandy914@gmail.com', 'orders@imarand.com')
);

CREATE POLICY "Admins can create ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_permissions.account_created = true
  )
  OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('chuandy914@gmail.com', 'orders@imarand.com')
);