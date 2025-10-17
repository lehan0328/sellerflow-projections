-- Function to update affiliate tier based on referral count
CREATE OR REPLACE FUNCTION update_affiliate_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_count INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Count total referrals for this affiliate
  SELECT COUNT(*) INTO v_referral_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id;
  
  -- Determine tier based on referral count
  -- Tiers: starter (0-4), growth (5-19), pro (20-49), elite (50+)
  CASE
    WHEN v_referral_count >= 50 THEN v_new_tier := 'elite';
    WHEN v_referral_count >= 20 THEN v_new_tier := 'pro';
    WHEN v_referral_count >= 5 THEN v_new_tier := 'growth';
    ELSE v_new_tier := 'starter';
  END CASE;
  
  -- Update the affiliate's tier and total_referrals count
  UPDATE affiliates
  SET 
    tier = v_new_tier,
    total_referrals = v_referral_count,
    updated_at = NOW()
  WHERE id = NEW.affiliate_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update tier when affiliate referrals are inserted
DROP TRIGGER IF EXISTS update_affiliate_tier_on_referral ON affiliate_referrals;
CREATE TRIGGER update_affiliate_tier_on_referral
AFTER INSERT OR UPDATE OR DELETE ON affiliate_referrals
FOR EACH ROW
EXECUTE FUNCTION update_affiliate_tier();

-- Also update commission rate based on tier
CREATE OR REPLACE FUNCTION update_affiliate_commission_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set commission rate based on tier
  -- starter: 20%, growth: 25%, pro: 30%, elite: 35%
  CASE NEW.tier
    WHEN 'elite' THEN NEW.commission_rate := 35;
    WHEN 'pro' THEN NEW.commission_rate := 30;
    WHEN 'growth' THEN NEW.commission_rate := 25;
    ELSE NEW.commission_rate := 20;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Trigger to update commission rate when tier changes
DROP TRIGGER IF EXISTS update_commission_on_tier_change ON affiliates;
CREATE TRIGGER update_commission_on_tier_change
BEFORE UPDATE OF tier ON affiliates
FOR EACH ROW
WHEN (OLD.tier IS DISTINCT FROM NEW.tier)
EXECUTE FUNCTION update_affiliate_commission_rate();