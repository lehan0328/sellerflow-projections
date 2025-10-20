-- Create forecast accuracy tracking table
CREATE TABLE IF NOT EXISTS public.forecast_accuracy_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  amazon_account_id UUID REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  payout_date DATE NOT NULL,
  forecasted_amount NUMERIC NOT NULL,
  actual_amount NUMERIC NOT NULL,
  difference_amount NUMERIC NOT NULL,
  difference_percentage NUMERIC NOT NULL,
  settlement_id TEXT NOT NULL,
  marketplace_name TEXT,
  user_email TEXT,
  user_name TEXT,
  monthly_revenue TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.forecast_accuracy_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all forecast accuracy logs"
  ON public.forecast_accuracy_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE users.id = auth.uid()
      AND users.email = 'chuandy914@gmail.com'
    )
  );

CREATE POLICY "Users can view their own forecast accuracy logs"
  ON public.forecast_accuracy_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert forecast accuracy logs"
  ON public.forecast_accuracy_log
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_forecast_accuracy_user_id ON public.forecast_accuracy_log(user_id);
CREATE INDEX idx_forecast_accuracy_date ON public.forecast_accuracy_log(payout_date DESC);
CREATE INDEX idx_forecast_accuracy_created_at ON public.forecast_accuracy_log(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_forecast_accuracy_log_updated_at
  BEFORE UPDATE ON public.forecast_accuracy_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();