-- Create Amazon accounts table for storing seller account information
CREATE TABLE public.amazon_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seller_id TEXT NOT NULL,
  marketplace_id TEXT NOT NULL,
  marketplace_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  encrypted_access_token TEXT,
  encrypted_client_id TEXT,
  encrypted_client_secret TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Amazon transactions table for storing transaction data from Amazon API
CREATE TABLE public.amazon_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amazon_account_id UUID NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'Order', 'Refund', 'FBAInventoryFee', etc.
  amount NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  settlement_id TEXT,
  order_id TEXT,
  sku TEXT,
  marketplace_name TEXT,
  description TEXT,
  fee_type TEXT,
  fee_description TEXT,
  raw_data JSONB, -- Store full Amazon API response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(amazon_account_id, transaction_id)
);

-- Create Amazon payouts table for calculated payout information
CREATE TABLE public.amazon_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amazon_account_id UUID NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  settlement_id TEXT NOT NULL,
  payout_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'estimated', -- 'confirmed', 'estimated', 'processing'
  payout_type TEXT NOT NULL DEFAULT 'bi-weekly', -- 'bi-weekly', 'reserve-release', 'adjustment'
  marketplace_name TEXT NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  fees_total NUMERIC DEFAULT 0,
  orders_total NUMERIC DEFAULT 0,
  refunds_total NUMERIC DEFAULT 0,
  other_total NUMERIC DEFAULT 0,
  raw_settlement_data JSONB, -- Store full settlement report data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(amazon_account_id, settlement_id)
);

-- Enable Row Level Security
ALTER TABLE public.amazon_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for amazon_accounts
CREATE POLICY "Users can view their own Amazon accounts" 
ON public.amazon_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Amazon accounts" 
ON public.amazon_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Amazon accounts" 
ON public.amazon_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Amazon accounts" 
ON public.amazon_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for amazon_transactions
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

-- Create RLS policies for amazon_payouts
CREATE POLICY "Users can view their own Amazon payouts" 
ON public.amazon_payouts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Amazon payouts" 
ON public.amazon_payouts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Amazon payouts" 
ON public.amazon_payouts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Amazon payouts" 
ON public.amazon_payouts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_amazon_accounts_user_id ON public.amazon_accounts(user_id);
CREATE INDEX idx_amazon_accounts_seller_id ON public.amazon_accounts(seller_id);
CREATE INDEX idx_amazon_transactions_user_id ON public.amazon_transactions(user_id);
CREATE INDEX idx_amazon_transactions_account_id ON public.amazon_transactions(amazon_account_id);
CREATE INDEX idx_amazon_transactions_date ON public.amazon_transactions(transaction_date);
CREATE INDEX idx_amazon_payouts_user_id ON public.amazon_payouts(user_id);
CREATE INDEX idx_amazon_payouts_account_id ON public.amazon_payouts(amazon_account_id);
CREATE INDEX idx_amazon_payouts_date ON public.amazon_payouts(payout_date);

-- Create trigger to update updated_at column
CREATE TRIGGER update_amazon_accounts_updated_at
  BEFORE UPDATE ON public.amazon_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amazon_transactions_updated_at
  BEFORE UPDATE ON public.amazon_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amazon_payouts_updated_at
  BEFORE UPDATE ON public.amazon_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create functions for secure Amazon account management
CREATE OR REPLACE FUNCTION public.insert_secure_amazon_account(
  p_seller_id TEXT,
  p_marketplace_id TEXT,
  p_marketplace_name TEXT,
  p_account_name TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_client_id TEXT DEFAULT NULL,
  p_client_secret TEXT DEFAULT NULL
)
RETURNS UUID
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
  IF p_seller_id IS NULL OR p_marketplace_id IS NULL OR p_marketplace_name IS NULL OR p_account_name IS NULL THEN
    RAISE EXCEPTION 'Seller ID, marketplace ID, marketplace name, and account name are required';
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.amazon_accounts (
    user_id,
    seller_id,
    marketplace_id,
    marketplace_name,
    account_name,
    encrypted_refresh_token,
    encrypted_access_token,
    encrypted_client_id,
    encrypted_client_secret,
    last_sync
  ) VALUES (
    auth.uid(),
    p_seller_id,
    p_marketplace_id,
    p_marketplace_name,
    p_account_name,
    encrypt_banking_credential(p_refresh_token),
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_client_id),
    encrypt_banking_credential(p_client_secret),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Create function to update Amazon account securely
CREATE OR REPLACE FUNCTION public.update_secure_amazon_account(
  p_account_id UUID,
  p_account_name TEXT DEFAULT NULL,
  p_refresh_token TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_client_id TEXT DEFAULT NULL,
  p_client_secret TEXT DEFAULT NULL,
  p_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.amazon_accounts SET
    account_name = COALESCE(p_account_name, account_name),
    encrypted_refresh_token = CASE 
      WHEN p_refresh_token IS NOT NULL THEN encrypt_banking_credential(p_refresh_token)
      ELSE encrypted_refresh_token 
    END,
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_client_id = CASE 
      WHEN p_client_id IS NOT NULL THEN encrypt_banking_credential(p_client_id)
      ELSE encrypted_client_id 
    END,
    encrypted_client_secret = CASE 
      WHEN p_client_secret IS NOT NULL THEN encrypt_banking_credential(p_client_secret)
      ELSE encrypted_client_secret 
    END,
    token_expires_at = COALESCE(p_token_expires_at, token_expires_at),
    last_sync = NOW(),
    updated_at = NOW()
  WHERE id = p_account_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;