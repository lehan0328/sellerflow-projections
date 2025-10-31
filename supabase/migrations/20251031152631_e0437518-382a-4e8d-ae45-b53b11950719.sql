-- Add admin policy to view all Amazon payouts
CREATE POLICY "Admins can view all Amazon payouts"
ON amazon_payouts
FOR SELECT
TO authenticated
USING (
  has_admin_role(auth.uid()) OR is_website_admin()
);