-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table to store daily cash flow insights
CREATE TABLE public.cash_flow_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_date DATE NOT NULL,
  advice TEXT NOT NULL,
  current_balance NUMERIC,
  daily_inflow NUMERIC,
  daily_outflow NUMERIC,
  upcoming_expenses NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, insight_date)
);

-- Enable RLS
ALTER TABLE public.cash_flow_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own insights" 
ON public.cash_flow_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" 
ON public.cash_flow_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
ON public.cash_flow_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_cash_flow_insights_user_date ON public.cash_flow_insights(user_id, insight_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_cash_flow_insights_updated_at
BEFORE UPDATE ON public.cash_flow_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Schedule daily insights generation at 12am EST (5am UTC)
SELECT cron.schedule(
  'generate-daily-cash-flow-insights',
  '0 5 * * *', -- 5am UTC = 12am EST
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/generate-daily-insights',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);