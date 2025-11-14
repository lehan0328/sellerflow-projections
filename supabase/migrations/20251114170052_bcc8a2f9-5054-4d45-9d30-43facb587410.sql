-- Create function to atomically increment referral code usage
CREATE OR REPLACE FUNCTION public.increment_referral_code_usage(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE code = p_code;
END;
$$;