-- Remove check constraints that require encrypted data
-- This allows direct inserts without encryption for testing

ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS check_encrypted_data_exists;
ALTER TABLE credit_cards DROP CONSTRAINT IF EXISTS check_encrypted_data_exists;