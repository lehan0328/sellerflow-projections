-- Add credit card support to bank_transactions table
ALTER TABLE bank_transactions
ALTER COLUMN bank_account_id DROP NOT NULL;

ALTER TABLE bank_transactions
ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE;

-- Add check constraint to ensure either bank_account_id or credit_card_id is set
ALTER TABLE bank_transactions
ADD CONSTRAINT bank_transactions_account_check 
CHECK (
  (bank_account_id IS NOT NULL AND credit_card_id IS NULL) OR
  (bank_account_id IS NULL AND credit_card_id IS NOT NULL)
);

-- Add index for credit card transactions
CREATE INDEX idx_bank_transactions_credit_card_id ON bank_transactions(credit_card_id);

COMMENT ON COLUMN bank_transactions.credit_card_id IS 'Reference to credit card if transaction is from a credit card account';
COMMENT ON CONSTRAINT bank_transactions_account_check ON bank_transactions IS 'Ensure exactly one of bank_account_id or credit_card_id is set';