-- Create daily aggregated transactions table for older data
CREATE TABLE IF NOT EXISTS public.amazon_transactions_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID,
  amazon_account_id UUID NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  
  -- Aggregated metrics
  orders_count INTEGER DEFAULT 0,
  orders_total NUMERIC(12, 2) DEFAULT 0,
  refunds_count INTEGER DEFAULT 0,
  refunds_total NUMERIC(12, 2) DEFAULT 0,
  fees_total NUMERIC(12, 2) DEFAULT 0,
  adjustments_total NUMERIC(12, 2) DEFAULT 0,
  net_amount NUMERIC(12, 2) DEFAULT 0,
  
  -- Settlement tracking
  settlement_id TEXT,
  unlock_date DATE,
  
  -- Metadata
  transaction_count INTEGER DEFAULT 0,
  marketplace_name TEXT,
  currency_code TEXT DEFAULT 'USD',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(amazon_account_id, transaction_date)
);

-- Add RLS policies for daily summaries
ALTER TABLE public.amazon_transactions_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their daily summaries"
  ON public.amazon_transactions_daily_summary
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their daily summaries"
  ON public.amazon_transactions_daily_summary
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their daily summaries"
  ON public.amazon_transactions_daily_summary
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their daily summaries"
  ON public.amazon_transactions_daily_summary
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_daily_summary_account_date ON public.amazon_transactions_daily_summary(amazon_account_id, transaction_date DESC);
CREATE INDEX idx_daily_summary_user_date ON public.amazon_transactions_daily_summary(user_id, transaction_date DESC);

-- Add updated_at trigger
CREATE TRIGGER update_daily_summary_updated_at
  BEFORE UPDATE ON public.amazon_transactions_daily_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();