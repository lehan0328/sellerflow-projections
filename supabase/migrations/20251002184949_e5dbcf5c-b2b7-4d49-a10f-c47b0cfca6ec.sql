-- Create deleted_transactions table to track deleted vendor and income transactions
CREATE TABLE IF NOT EXISTS public.deleted_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('vendor', 'income')),
  original_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_date DATE,
  status TEXT,
  category TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.deleted_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own deleted transactions"
  ON public.deleted_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deleted transactions"
  ON public.deleted_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deleted transactions"
  ON public.deleted_transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_deleted_transactions_user_id ON public.deleted_transactions(user_id);
CREATE INDEX idx_deleted_transactions_deleted_at ON public.deleted_transactions(deleted_at DESC);