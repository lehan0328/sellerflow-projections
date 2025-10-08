-- Create table to track add-on usage during trial
CREATE TABLE IF NOT EXISTS public.trial_addon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('bank_account', 'amazon_account', 'user')),
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, addon_type)
);

-- Enable RLS
ALTER TABLE public.trial_addon_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own trial addon usage"
  ON public.trial_addon_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trial addon usage"
  ON public.trial_addon_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trial addon usage"
  ON public.trial_addon_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_trial_addon_usage_updated_at
  BEFORE UPDATE ON public.trial_addon_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_trial_addon_usage_user_id ON public.trial_addon_usage(user_id);

COMMENT ON TABLE public.trial_addon_usage IS 'Tracks add-on usage during trial period for automatic conversion to paid add-ons';
COMMENT ON COLUMN public.trial_addon_usage.addon_type IS 'Type of add-on: bank_account, amazon_account, or user';
COMMENT ON COLUMN public.trial_addon_usage.quantity IS 'Number of additional items beyond plan limits';