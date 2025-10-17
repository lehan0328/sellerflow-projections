-- Fix RLS policies for referral_codes to include website admin
DROP POLICY IF EXISTS "Admins can view all referral codes" ON public.referral_codes;
CREATE POLICY "Admins can view all referral codes" 
ON public.referral_codes 
FOR SELECT 
USING (has_admin_role(auth.uid()) OR is_website_admin());

-- Fix RLS policies for referrals to include website admin
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (has_admin_role(auth.uid()) OR is_website_admin());

-- Fix RLS policies for referral_rewards to include website admin
DROP POLICY IF EXISTS "Admins can view all referral rewards" ON public.referral_rewards;
CREATE POLICY "Admins can view all referral rewards" 
ON public.referral_rewards 
FOR SELECT 
USING (has_admin_role(auth.uid()) OR is_website_admin());

-- Also fix update policy for affiliates
DROP POLICY IF EXISTS "Admins can update all affiliates" ON public.affiliates;
CREATE POLICY "Admins can update all affiliates" 
ON public.affiliates 
FOR UPDATE 
USING (has_admin_role(auth.uid()) OR is_website_admin());

-- Fix view policy for affiliates
DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates" 
ON public.affiliates 
FOR SELECT 
USING (has_admin_role(auth.uid()) OR is_website_admin());

-- Fix policy for affiliate payouts
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.affiliate_payouts;
CREATE POLICY "Admins can view all payouts" 
ON public.affiliate_payouts 
FOR SELECT 
USING (has_admin_role(auth.uid()) OR is_website_admin());