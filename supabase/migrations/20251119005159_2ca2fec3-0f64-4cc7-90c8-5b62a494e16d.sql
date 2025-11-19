-- Remove the bank_transactions_account_check constraint to allow credit card payments
-- to have both bank_account_id (cash source) and credit_card_id (credit destination)
ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_account_check;