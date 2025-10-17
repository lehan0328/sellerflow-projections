-- Add columns to track trial vs paid referrals
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS trial_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_referrals INTEGER DEFAULT 0;

-- Update the tier calculation function to use paid referrals only
CREATE OR REPLACE FUNCTION update_affiliate_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_count INTEGER;
  v_paid_count INTEGER;
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
  
  -- Total count
  v_total_count := v_trial_count + v_paid_count;
  
  -- Determine tier based on PAID referral count only
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
    total_referrals = v_total_count,
    updated_at = NOW()
  WHERE id = NEW.affiliate_id;
  
  RETURN NEW;
END;
$$;

-- Update commission rate based on new tier structure
CREATE OR REPLACE FUNCTION update_affiliate_commission_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set commission rate based on tier
  -- starter: 15%, growth: 20%, pro: 25%, elite: 30%, god: 35%
  CASE NEW.tier
    WHEN 'god' THEN NEW.commission_rate := 35;
    WHEN 'elite' THEN NEW.commission_rate := 30;
    WHEN 'pro' THEN NEW.commission_rate := 25;
    WHEN 'growth' THEN NEW.commission_rate := 20;
    ELSE NEW.commission_rate := 15;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Update existing affiliates to have the correct commission rate for starter tier
UPDATE affiliates SET commission_rate = 15 WHERE tier = 'starter';