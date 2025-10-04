-- Add plan override columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_override text,
ADD COLUMN IF NOT EXISTS plan_override_reason text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_plan_override ON public.profiles(plan_override) WHERE plan_override IS NOT NULL;

-- Set your account to professional with lifetime access
UPDATE public.profiles 
SET plan_override = 'professional',
    plan_override_reason = 'Lifetime free access - Owner account'
WHERE email = 'chuandy914@gmail.com';

COMMENT ON COLUMN public.profiles.plan_override IS 'Manual plan override for special cases (e.g., lifetime access)';
COMMENT ON COLUMN public.profiles.plan_override_reason IS 'Reason for the plan override';