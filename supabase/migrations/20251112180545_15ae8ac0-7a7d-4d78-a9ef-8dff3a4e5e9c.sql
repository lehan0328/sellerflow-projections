-- Create RPC function to safely increment affiliate commission
CREATE OR REPLACE FUNCTION public.increment_affiliate_commission(
  p_affiliate_id UUID,
  p_commission_amount NUMERIC
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE affiliates
  SET 
    pending_commission = pending_commission + p_commission_amount,
    total_commission_earned = total_commission_earned + p_commission_amount,
    paid_referrals = paid_referrals + 1,
    trial_referrals = GREATEST(0, trial_referrals - 1),
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;