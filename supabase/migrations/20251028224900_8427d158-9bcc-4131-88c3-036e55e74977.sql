-- Create amazon_transactions table for order-level data with delivery dates
CREATE TABLE IF NOT EXISTS public.amazon_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  account_id UUID,
  transaction_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, amazon_account_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_amazon_transactions_account ON amazon_transactions(amazon_account_id);
CREATE INDEX IF NOT EXISTS idx_amazon_transactions_delivery_date ON amazon_transactions(delivery_date);
CREATE INDEX IF NOT EXISTS idx_amazon_transactions_transaction_date ON amazon_transactions(transaction_date);

-- Enable RLS
ALTER TABLE public.amazon_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own transactions
CREATE POLICY "Users can view their own Amazon transactions"
  ON public.amazon_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Amazon transactions"
  ON public.amazon_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Amazon transactions"
  ON public.amazon_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Amazon transactions"
  ON public.amazon_transactions
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.amazon_transactions IS 'Order-level transaction data from Amazon Reports API with delivery dates for DD+7 forecasting';
