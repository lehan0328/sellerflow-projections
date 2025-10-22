-- Add fields to track initial balance snapshot for calculation
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS initial_balance_date TIMESTAMP WITH TIME ZONE;

-- Update existing accounts to set initial balance from current balance
UPDATE bank_accounts
SET 
  initial_balance = balance,
  initial_balance_date = COALESCE(last_sync, created_at)
WHERE initial_balance IS NULL;

-- Create function to calculate current balance from transactions
CREATE OR REPLACE FUNCTION calculate_bank_account_balance(account_id_param UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  initial_bal DECIMAL(12,2);
  initial_date TIMESTAMP WITH TIME ZONE;
  transaction_sum DECIMAL(12,2);
BEGIN
  -- Get initial balance and date
  SELECT initial_balance, initial_balance_date
  INTO initial_bal, initial_date
  FROM bank_accounts
  WHERE id = account_id_param;
  
  -- If no initial balance set, return current balance
  IF initial_bal IS NULL THEN
    SELECT balance INTO initial_bal
    FROM bank_accounts
    WHERE id = account_id_param;
    RETURN initial_bal;
  END IF;
  
  -- Sum all transactions since initial date
  -- Negative amounts are debits (money out), positive are credits (money in)
  SELECT COALESCE(SUM(-amount), 0)
  INTO transaction_sum
  FROM bank_transactions
  WHERE bank_account_id = account_id_param
    AND archived = false
    AND date >= initial_date;
  
  RETURN initial_bal + transaction_sum;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update balance when transactions are added/updated
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bank_accounts
  SET 
    balance = calculate_bank_account_balance(NEW.bank_account_id),
    updated_at = NOW()
  WHERE id = NEW.bank_account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_balance_on_transaction ON bank_transactions;

-- Create trigger for inserts and updates
CREATE TRIGGER trigger_update_balance_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_account_balance();

-- Add comment explaining the balance calculation approach
COMMENT ON COLUMN bank_accounts.initial_balance IS 'Snapshot of balance at initial_balance_date. Current balance calculated from this + sum of transactions';
COMMENT ON COLUMN bank_accounts.balance IS 'Calculated balance: initial_balance + sum of transactions since initial_balance_date';