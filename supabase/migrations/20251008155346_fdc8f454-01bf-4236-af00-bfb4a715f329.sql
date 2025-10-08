-- Update referral_rewards table structure
ALTER TABLE referral_rewards 
ADD COLUMN IF NOT EXISTS pending_cash_bonus numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ticket_tier integer DEFAULT 0;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);

-- Function to update referral rewards when a referral converts
CREATE OR REPLACE FUNCTION update_referral_rewards()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_current_count INTEGER;
  v_new_tier INTEGER;
  v_discount_pct INTEGER;
  v_cash_bonus NUMERIC;
  v_duration_months INTEGER;
  v_old_tier INTEGER;
BEGIN
  -- Only process when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    v_referrer_id := NEW.referrer_id;
    
    -- Get current active referral count
    SELECT COUNT(*) INTO v_current_count
    FROM referrals
    WHERE referrer_id = v_referrer_id AND status = 'active';
    
    -- Determine tier based on count
    -- Tiers: 1, 2, 5, 10, 20, 50, 100
    CASE
      WHEN v_current_count >= 100 THEN 
        v_new_tier := 7;
        v_discount_pct := 0; -- 6 months free
        v_cash_bonus := 3000;
        v_duration_months := 6;
      WHEN v_current_count >= 50 THEN 
        v_new_tier := 6;
        v_discount_pct := 50;
        v_cash_bonus := 1000;
        v_duration_months := 3;
      WHEN v_current_count >= 20 THEN 
        v_new_tier := 5;
        v_discount_pct := 40;
        v_cash_bonus := 200;
        v_duration_months := 3;
      WHEN v_current_count >= 10 THEN 
        v_new_tier := 4;
        v_discount_pct := 30;
        v_cash_bonus := 100;
        v_duration_months := 3;
      WHEN v_current_count >= 5 THEN 
        v_new_tier := 3;
        v_discount_pct := 25;
        v_cash_bonus := 50;
        v_duration_months := 3;
      WHEN v_current_count >= 2 THEN 
        v_new_tier := 2;
        v_discount_pct := 20;
        v_cash_bonus := 0;
        v_duration_months := 3;
      WHEN v_current_count >= 1 THEN 
        v_new_tier := 1;
        v_discount_pct := 15;
        v_cash_bonus := 0;
        v_duration_months := 3;
      ELSE
        v_new_tier := 0;
        v_discount_pct := 0;
        v_cash_bonus := 0;
        v_duration_months := 0;
    END CASE;
    
    -- Get old tier
    SELECT COALESCE(tier_level, 0) INTO v_old_tier
    FROM referral_rewards
    WHERE user_id = v_referrer_id;
    
    -- Update or insert referral_rewards
    INSERT INTO referral_rewards (
      user_id,
      referral_count,
      tier_level,
      discount_percentage,
      cash_bonus,
      pending_cash_bonus,
      discount_start_date,
      discount_end_date,
      total_cash_earned,
      reward_status
    ) VALUES (
      v_referrer_id,
      v_current_count,
      v_new_tier,
      v_discount_pct,
      v_cash_bonus,
      v_cash_bonus,
      NOW(),
      NOW() + (v_duration_months || ' months')::INTERVAL,
      v_cash_bonus,
      'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      referral_count = v_current_count,
      tier_level = v_new_tier,
      discount_percentage = v_discount_pct,
      cash_bonus = v_cash_bonus,
      pending_cash_bonus = CASE 
        WHEN v_new_tier > v_old_tier AND v_cash_bonus > 0 
        THEN referral_rewards.pending_cash_bonus + v_cash_bonus
        ELSE referral_rewards.pending_cash_bonus
      END,
      discount_start_date = NOW(),
      discount_end_date = NOW() + (v_duration_months || ' months')::INTERVAL,
      total_cash_earned = referral_rewards.total_cash_earned + v_cash_bonus,
      reward_status = 'active',
      updated_at = NOW();
    
    -- Create support ticket for cash bonus redemption if tier increased and has cash bonus
    IF v_new_tier > v_old_tier AND v_cash_bonus > 0 THEN
      INSERT INTO support_tickets (
        user_id,
        subject,
        message,
        category,
        status,
        priority
      ) VALUES (
        v_referrer_id,
        'Referral Cash Bonus Redemption - Tier ' || v_new_tier,
        'Congratulations! You have reached ' || v_current_count || ' referrals and earned a $' || v_cash_bonus || ' cash bonus. Please provide your payment details to redeem this reward.',
        'Referral Rewards',
        'open',
        'high'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic reward updates
DROP TRIGGER IF EXISTS trigger_update_referral_rewards ON referrals;
CREATE TRIGGER trigger_update_referral_rewards
  AFTER INSERT OR UPDATE OF status ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_rewards();

-- Add RLS policies for admins to view all referrals
CREATE POLICY "Admins can view all referrals" ON referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all referral rewards" ON referral_rewards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all referral codes" ON referral_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );