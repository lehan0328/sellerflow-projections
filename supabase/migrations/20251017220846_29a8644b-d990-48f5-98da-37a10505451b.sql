-- Ensure website admin can view all affiliate referrals
DROP POLICY IF EXISTS "Affiliates can view their referrals" ON public.affiliate_referrals;
CREATE POLICY "Affiliates can view their referrals" 
ON public.affiliate_referrals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM affiliates
    WHERE affiliates.id = affiliate_referrals.affiliate_id 
    AND affiliates.user_id = auth.uid()
  ) 
  OR has_admin_role(auth.uid()) 
  OR is_website_admin()
);

-- Ensure system can still manage affiliate referrals
DROP POLICY IF EXISTS "System can manage affiliate referrals" ON public.affiliate_referrals;
CREATE POLICY "System can manage affiliate referrals" 
ON public.affiliate_referrals 
FOR ALL 
USING (true)
WITH CHECK (true);