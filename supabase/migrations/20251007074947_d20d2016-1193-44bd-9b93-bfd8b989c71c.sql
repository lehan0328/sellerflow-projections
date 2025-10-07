-- Add 'partially_paid' to the allowed status values for transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'paid', 'partially_paid'));