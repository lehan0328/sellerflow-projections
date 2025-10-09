-- Create plan_limits table to store all plan-based limits
CREATE TABLE IF NOT EXISTS public.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  bank_connections INTEGER NOT NULL,
  amazon_connections INTEGER NOT NULL,
  team_members INTEGER NOT NULL, -- Including owner
  has_ai_insights BOOLEAN DEFAULT false,
  has_ai_pdf_extractor BOOLEAN DEFAULT false,
  has_automated_notifications BOOLEAN DEFAULT false,
  has_scenario_planning BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert plan limits matching the pricing page
INSERT INTO public.plan_limits (plan_name, bank_connections, amazon_connections, team_members, has_ai_insights, has_ai_pdf_extractor, has_automated_notifications, has_scenario_planning) VALUES
('starter', 2, 1, 1, false, false, false, false),
('growing', 4, 1, 3, true, true, false, false),
('professional', 7, 1, 6, true, true, true, true),
('enterprise', 5, 2, 8, true, true, true, true);

-- Update handle_new_user function to set max_team_members to 6 for trial users (professional plan)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Get referral code from metadata if present
  v_referral_code := NEW.raw_user_meta_data ->> 'referral_code';

  -- Insert profile with professional plan limits (6 team members for trial)
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    trial_start,
    trial_end,
    max_team_members
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    now(),
    now() + interval '168 hours',
    6  -- Professional plan allows 6 team members (owner + 5 additional)
  );

  -- Handle referral if code was provided
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    -- Find the referrer by code
    SELECT rc.user_id INTO v_referrer_id
    FROM public.referral_codes rc
    WHERE rc.code = v_referral_code;

    -- Create referral record if referrer found
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      INSERT INTO public.referrals (
        referrer_id,
        referred_user_id,
        referral_code,
        status
      ) VALUES (
        v_referrer_id,
        NEW.id,
        v_referral_code,
        'trial'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create function to get plan limits based on user's subscription
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  bank_connections INTEGER,
  amazon_connections INTEGER,
  team_members INTEGER,
  has_ai_insights BOOLEAN,
  has_ai_pdf_extractor BOOLEAN,
  has_automated_notifications BOOLEAN,
  has_scenario_planning BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_override TEXT;
  v_trial_end TIMESTAMP WITH TIME ZONE;
  v_plan_name TEXT;
BEGIN
  -- Get user's plan override and trial status
  SELECT p.plan_override, p.trial_end INTO v_plan_override, v_trial_end
  FROM profiles p
  WHERE p.user_id = p_user_id;

  -- Determine plan name
  IF v_trial_end IS NOT NULL AND v_trial_end > NOW() THEN
    -- User is in trial, use professional plan limits
    v_plan_name := 'professional';
  ELSIF v_plan_override IS NOT NULL THEN
    -- Extract plan name from override (e.g., 'professional', 'starter', etc.)
    v_plan_name := v_plan_override;
  ELSE
    -- Default to starter plan
    v_plan_name := 'starter';
  END IF;

  -- Return plan limits
  RETURN QUERY
  SELECT 
    pl.plan_name,
    pl.bank_connections,
    pl.amazon_connections,
    pl.team_members,
    pl.has_ai_insights,
    pl.has_ai_pdf_extractor,
    pl.has_automated_notifications,
    pl.has_scenario_planning
  FROM plan_limits pl
  WHERE pl.plan_name = v_plan_name;
END;
$$;