-- Add account_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN account_status text NOT NULL DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.account_status IS 'Account status: active, suspended_payment, suspended_other';

-- Create index for faster queries
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);

-- Add payment_failure_date column to track when payment failed
ALTER TABLE public.profiles 
ADD COLUMN payment_failure_date timestamp with time zone;

-- Add stripe_customer_id for easier payment tracking
ALTER TABLE public.profiles 
ADD COLUMN stripe_customer_id text;