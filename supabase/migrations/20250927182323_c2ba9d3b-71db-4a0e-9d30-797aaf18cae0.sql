-- Create credit cards table for user credit card management
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  institution_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'credit',
  masked_account_number TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  available_credit NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  encrypted_access_token TEXT,
  encrypted_account_number TEXT,
  encrypted_plaid_item_id TEXT,
  last_sync TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Plaid-specific fields
  plaid_account_id TEXT,
  
  -- Credit card specific fields
  minimum_payment NUMERIC DEFAULT 0,
  payment_due_date DATE,
  statement_close_date DATE,
  annual_fee NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own credit cards" 
ON public.credit_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit cards" 
ON public.credit_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards" 
ON public.credit_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards" 
ON public.credit_cards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create secure functions for credit card management
CREATE OR REPLACE FUNCTION public.insert_secure_credit_card(
  p_institution_name TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT 'credit',
  p_balance NUMERIC DEFAULT 0,
  p_credit_limit NUMERIC DEFAULT 0,
  p_available_credit NUMERIC DEFAULT NULL,
  p_currency_code TEXT DEFAULT 'USD',
  p_access_token TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_plaid_item_id TEXT DEFAULT NULL,
  p_plaid_account_id TEXT DEFAULT NULL,
  p_minimum_payment NUMERIC DEFAULT 0,
  p_payment_due_date DATE DEFAULT NULL,
  p_statement_close_date DATE DEFAULT NULL,
  p_annual_fee NUMERIC DEFAULT 0,
  p_interest_rate NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_institution_name IS NULL OR p_account_name IS NULL THEN
    RAISE EXCEPTION 'Institution name and account name are required';
  END IF;

  -- Calculate available credit if not provided
  IF p_available_credit IS NULL THEN
    p_available_credit := p_credit_limit - p_balance;
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.credit_cards (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    credit_limit,
    available_credit,
    currency_code,
    encrypted_access_token,
    encrypted_account_number,
    encrypted_plaid_item_id,
    plaid_account_id,
    minimum_payment,
    payment_due_date,
    statement_close_date,
    annual_fee,
    interest_rate,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_credit_limit,
    p_available_credit,
    p_currency_code,
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_account_number),
    encrypt_banking_credential(p_plaid_item_id),
    p_plaid_account_id,
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_interest_rate,
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

-- Create update function for credit cards
CREATE OR REPLACE FUNCTION public.update_secure_credit_card(
  p_card_id UUID,
  p_institution_name TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT NULL,
  p_balance NUMERIC DEFAULT NULL,
  p_credit_limit NUMERIC DEFAULT NULL,
  p_available_credit NUMERIC DEFAULT NULL,
  p_currency_code TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_plaid_item_id TEXT DEFAULT NULL,
  p_plaid_account_id TEXT DEFAULT NULL,
  p_minimum_payment NUMERIC DEFAULT NULL,
  p_payment_due_date DATE DEFAULT NULL,
  p_statement_close_date DATE DEFAULT NULL,
  p_annual_fee NUMERIC DEFAULT NULL,
  p_interest_rate NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.credit_cards SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    credit_limit = COALESCE(p_credit_limit, credit_limit),
    available_credit = COALESCE(p_available_credit, available_credit),
    currency_code = COALESCE(p_currency_code, currency_code),
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_account_number = CASE 
      WHEN p_account_number IS NOT NULL THEN encrypt_banking_credential(p_account_number)
      ELSE encrypted_account_number 
    END,
    encrypted_plaid_item_id = CASE 
      WHEN p_plaid_item_id IS NOT NULL THEN encrypt_banking_credential(p_plaid_item_id)
      ELSE encrypted_plaid_item_id 
    END,
    plaid_account_id = COALESCE(p_plaid_account_id, plaid_account_id),
    minimum_payment = COALESCE(p_minimum_payment, minimum_payment),
    payment_due_date = COALESCE(p_payment_due_date, payment_due_date),
    statement_close_date = COALESCE(p_statement_close_date, statement_close_date),
    annual_fee = COALESCE(p_annual_fee, annual_fee),
    interest_rate = COALESCE(p_interest_rate, interest_rate),
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$;