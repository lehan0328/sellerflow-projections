-- Add 'trial_expired' as a valid account_status value
-- This distinguishes users who never paid (trial expired) from users whose payments failed (suspended_payment)

-- First, check if the check constraint exists and drop it if it does
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_account_status_check;
  END IF;
END $$;

-- Add new constraint with 'trial_expired' as a valid value
ALTER TABLE profiles 
ADD CONSTRAINT profiles_account_status_check 
CHECK (account_status IN ('active', 'suspended_payment', 'trial_expired'));