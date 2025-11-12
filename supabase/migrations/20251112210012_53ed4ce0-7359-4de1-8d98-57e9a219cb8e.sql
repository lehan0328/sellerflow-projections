-- Allow anonymous and authenticated users to validate active referral codes
CREATE POLICY "Allow public to validate active referral codes"
ON public.referral_codes
FOR SELECT
TO anon, authenticated
USING (is_active = true);