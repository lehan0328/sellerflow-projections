-- Add unique constraint to referral codes to prevent duplicates
ALTER TABLE public.referral_codes 
ADD CONSTRAINT referral_codes_code_unique UNIQUE (code);

-- Add a column to track if referred users get a discount
ALTER TABLE public.referrals 
ADD COLUMN referred_user_discount_applied BOOLEAN DEFAULT FALSE;

-- Create a function to apply 10% discount to referred users
CREATE OR REPLACE FUNCTION public.apply_referred_user_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a referral is created, give the referred user a 10% discount
  IF NEW.status = 'trial' THEN
    -- Update the referred user's profile with a 10% discount
    UPDATE public.profiles
    SET plan_override = 'referred_user_discount'
    WHERE user_id = NEW.referred_user_id;
    
    -- Mark that discount was applied
    NEW.referred_user_discount_applied := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to apply discount when referral is created
CREATE TRIGGER on_referral_created
  BEFORE INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_referred_user_discount();