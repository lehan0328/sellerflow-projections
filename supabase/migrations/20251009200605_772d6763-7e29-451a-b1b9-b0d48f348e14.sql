-- Add churn_date column to track when users churned
ALTER TABLE public.profiles 
ADD COLUMN churn_date TIMESTAMP WITH TIME ZONE;

-- Create index for churn_date queries
CREATE INDEX idx_profiles_churn_date ON public.profiles(churn_date);

COMMENT ON COLUMN public.profiles.churn_date IS 'Date when user churned (trial expired without converting or subscription ended)';