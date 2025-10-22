-- Add initial balance tracking to credit cards table
ALTER TABLE credit_cards
ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS initial_balance_date TIMESTAMP WITH TIME ZONE;

-- Update existing credit cards to set initial balance from current balance
UPDATE credit_cards
SET 
  initial_balance = balance,
  initial_balance_date = COALESCE(last_sync, created_at)
WHERE initial_balance IS NULL;

-- Create function to calculate credit card balance from transactions
CREATE OR REPLACE FUNCTION calculate_credit_card_balance(card_id_param UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  initial_bal DECIMAL(12,2);
  initial_date TIMESTAMP WITH TIME ZONE;
  transaction_sum DECIMAL(12,2);
BEGIN
  -- Get initial balance and date
  SELECT initial_balance, initial_balance_date
  INTO initial_bal, initial_date
  FROM credit_cards
  WHERE id = card_id_param;
  
  -- If no initial balance set, return current balance
  IF initial_bal IS NULL THEN
    SELECT balance INTO initial_bal
    FROM credit_cards
    WHERE id = card_id_param;
    RETURN initial_bal;
  END IF;
  
  -- Sum all transactions since initial date for this credit card
  -- Credit card transactions are debits (charges increase balance)
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_sum
  FROM transactions
  WHERE credit_card_id = card_id_param
    AND archived = false
    AND payment_date >= initial_date;
  
  RETURN initial_bal + transaction_sum;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON COLUMN credit_cards.initial_balance IS 'Snapshot of balance at initial_balance_date. Current balance calculated from this + sum of transactions';
COMMENT ON COLUMN credit_cards.balance IS 'Calculated balance: initial_balance + sum of credit card transactions since initial_balance_date';