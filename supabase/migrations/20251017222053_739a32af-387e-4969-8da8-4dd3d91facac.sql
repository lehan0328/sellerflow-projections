-- Add churned_referrals column to affiliates table
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS churned_referrals INTEGER DEFAULT 0;

-- Update the tier update function to track trial, paid, and churned separately
CREATE OR REPLACE FUNCTION public.update_affiliate_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_count INTEGER;
  v_paid_count INTEGER;
  v_churned_count INTEGER;
  v_total_count INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Count trial referrals (status = 'trial')
  SELECT COUNT(*) INTO v_trial_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'trial';
  
  -- Count paid referrals (status = 'active')
  SELECT COUNT(*) INTO v_paid_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'active';
  
  -- Count churned referrals (status = 'churned')
  SELECT COUNT(*) INTO v_churned_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'churned';
  
  -- Total count (excluding churned)
  v_total_count := v_trial_count + v_paid_count;
  
  -- Determine tier based on PAID referral count only (churned not counted)
  -- starter: 0-10 (15%), growth: 11-30 (20%), pro: 31-50 (25%), elite: 51-100 (30%), god: 100+ (35%)
  CASE
    WHEN v_paid_count >= 100 THEN v_new_tier := 'god';
    WHEN v_paid_count >= 51 THEN v_new_tier := 'elite';
    WHEN v_paid_count >= 31 THEN v_new_tier := 'pro';
    WHEN v_paid_count >= 11 THEN v_new_tier := 'growth';
    ELSE v_new_tier := 'starter';
  END CASE;
  
  -- Update the affiliate's tier and referral counts
  UPDATE affiliates
  SET 
    tier = v_new_tier,
    trial_referrals = v_trial_count,
    paid_referrals = v_paid_count,
    churned_referrals = v_churned_count,
    total_referrals = v_total_count,
    updated_at = NOW()
  WHERE id = NEW.affiliate_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for tier updates
DROP TRIGGER IF EXISTS update_affiliate_tier_on_referral ON affiliate_referrals;
CREATE TRIGGER update_affiliate_tier_on_referral
  AFTER INSERT OR UPDATE OR DELETE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_tier();

-- Function to handle affiliate churn (deduct commission)
CREATE OR REPLACE FUNCTION public.handle_affiliate_churn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_id UUID;
BEGIN
  -- Only process if status changed from 'active' to 'churned'
  IF OLD.status = 'active' AND NEW.status = 'churned' THEN
    v_affiliate_id := NEW.affiliate_id;
    
    -- Deduct commission for churned customer
    -- You might want to track how much commission was already paid for this referral
    -- and adjust pending_commission accordingly
    UPDATE affiliates
    SET 
      pending_commission = GREATEST(0, pending_commission - COALESCE(NEW.commission_amount, 0)),
      updated_at = NOW()
    WHERE id = v_affiliate_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for churn handling
DROP TRIGGER IF EXISTS handle_affiliate_referral_churn ON affiliate_referrals;
CREATE TRIGGER handle_affiliate_referral_churn
  AFTER UPDATE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION handle_affiliate_churn();