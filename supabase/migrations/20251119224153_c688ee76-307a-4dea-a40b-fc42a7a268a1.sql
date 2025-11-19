-- Create credit_card_payments table
CREATE TABLE IF NOT EXISTS public.credit_card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  description TEXT,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('manual', 'bill_payment')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_card_payments_user_id ON public.credit_card_payments(user_id);

-- Create index on account_id for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_card_payments_account_id ON public.credit_card_payments(account_id);

-- Create index on credit_card_id for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_card_payments_credit_card_id ON public.credit_card_payments(credit_card_id);

-- Create index on payment_date for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_credit_card_payments_payment_date ON public.credit_card_payments(payment_date);

-- Enable RLS
ALTER TABLE public.credit_card_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Account members can view their credit card payments
CREATE POLICY "Account members can view credit card payments"
  ON public.credit_card_payments
  FOR SELECT
  USING (user_belongs_to_account(account_id));

-- Policy: Account members can create credit card payments
CREATE POLICY "Account members can create credit card payments"
  ON public.credit_card_payments
  FOR INSERT
  WITH CHECK (user_belongs_to_account(account_id));

-- Policy: Account members can update credit card payments
CREATE POLICY "Account members can update credit card payments"
  ON public.credit_card_payments
  FOR UPDATE
  USING (user_belongs_to_account(account_id));

-- Policy: Account members can delete credit card payments
CREATE POLICY "Account members can delete credit card payments"
  ON public.credit_card_payments
  FOR DELETE
  USING (user_belongs_to_account(account_id));

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_credit_card_payments_updated_at
  BEFORE UPDATE ON public.credit_card_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();