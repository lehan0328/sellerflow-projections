-- Add admin policies for referral_codes table to allow full management

-- Allow admins to insert referral codes
CREATE POLICY "Admins can insert referral codes"
ON public.referral_codes
FOR INSERT
TO public
WITH CHECK (has_admin_role(auth.uid()) OR is_website_admin());

-- Allow admins to update referral codes
CREATE POLICY "Admins can update referral codes"
ON public.referral_codes
FOR UPDATE
TO public
USING (has_admin_role(auth.uid()) OR is_website_admin())
WITH CHECK (has_admin_role(auth.uid()) OR is_website_admin());

-- Allow admins to delete referral codes
CREATE POLICY "Admins can delete referral codes"
ON public.referral_codes
FOR DELETE
TO public
USING (has_admin_role(auth.uid()) OR is_website_admin());