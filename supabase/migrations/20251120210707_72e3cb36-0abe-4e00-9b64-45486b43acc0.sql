-- Add was_paid column to credit_card_payments table
ALTER TABLE credit_card_payments 
ADD COLUMN was_paid BOOLEAN DEFAULT TRUE;

-- Add comment for documentation
COMMENT ON COLUMN credit_card_payments.was_paid IS 'Tracks whether the payment was actually completed in real life. Default TRUE assumes overdue payments were made unless user explicitly marks them as not paid.';