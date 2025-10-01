-- Create bank_transactions table to store transaction history
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT[],
  pending BOOLEAN NOT NULL DEFAULT false,
  payment_channel TEXT,
  transaction_type TEXT,
  currency_code TEXT DEFAULT 'USD',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(plaid_transaction_id, bank_account_id)
);

-- Enable RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bank transactions"
  ON public.bank_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank transactions"
  ON public.bank_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank transactions"
  ON public.bank_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank transactions"
  ON public.bank_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX idx_bank_transactions_account_id ON public.bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(date DESC);

-- Add plaid_account_id to insert function if not exists
DROP FUNCTION IF EXISTS public.insert_secure_bank_account(text, text, text, numeric, numeric, text, text, text, text);

CREATE OR REPLACE FUNCTION public.insert_secure_bank_account(
  p_institution_name TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT NULL,
  p_balance NUMERIC DEFAULT 0,
  p_available_balance NUMERIC DEFAULT NULL,
  p_currency_code TEXT DEFAULT 'USD',
  p_access_token TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_plaid_item_id TEXT DEFAULT NULL,
  p_plaid_account_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_institution_name IS NULL OR p_account_name IS NULL OR p_account_type IS NULL THEN
    RAISE EXCEPTION 'Institution name, account name, and account type are required';
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.bank_accounts (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    available_balance,
    currency_code,
    encrypted_access_token,
    encrypted_account_number,
    encrypted_plaid_item_id,
    plaid_account_id,
    account_id,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_available_balance,
    p_currency_code,
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_account_number),
    encrypt_banking_credential(p_plaid_item_id),
    p_plaid_account_id,
    COALESCE(p_plaid_account_id, gen_random_uuid()::text),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;