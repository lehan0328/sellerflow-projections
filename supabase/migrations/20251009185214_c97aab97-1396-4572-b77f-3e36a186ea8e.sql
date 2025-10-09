-- CRITICAL SECURITY FIX: Implement proper role-based access control

-- 1. Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- 2. Update all RLS policies to use the new function instead of profiles.is_admin

-- affiliate_payouts policies
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.affiliate_payouts;
CREATE POLICY "Admins can view all payouts" 
ON public.affiliate_payouts 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- affiliates policies
DROP POLICY IF EXISTS "Admins can update all affiliates" ON public.affiliates;
CREATE POLICY "Admins can update all affiliates" 
ON public.affiliates 
FOR UPDATE 
USING (public.has_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates" 
ON public.affiliates 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- referral_codes policies
DROP POLICY IF EXISTS "Admins can view all referral codes" ON public.referral_codes;
CREATE POLICY "Admins can view all referral codes" 
ON public.referral_codes 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- referral_rewards policies
DROP POLICY IF EXISTS "Admins can view all referral rewards" ON public.referral_rewards;
CREATE POLICY "Admins can view all referral rewards" 
ON public.referral_rewards 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- referrals policies
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- support_tickets policies
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
CREATE POLICY "Admins can delete support tickets" 
ON public.support_tickets 
FOR DELETE 
USING (public.has_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update all support tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (public.has_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- ticket_messages policies
DROP POLICY IF EXISTS "Admins can create ticket messages" ON public.ticket_messages;
CREATE POLICY "Admins can create ticket messages" 
ON public.ticket_messages 
FOR INSERT 
WITH CHECK (public.has_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all ticket messages" ON public.ticket_messages;
CREATE POLICY "Admins can view all ticket messages" 
ON public.ticket_messages 
FOR SELECT 
USING (public.has_admin_role(auth.uid()));

-- 3. Strengthen profiles table RLS to prevent updates to sensitive fields
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Remove email column from profiles (sensitive data should only be in auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 5. Remove is_admin column from profiles (roles are in user_roles table)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;