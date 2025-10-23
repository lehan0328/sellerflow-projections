-- Add unique constraint on transaction_id for amazon_transactions
-- This allows upsert operations to work properly
ALTER TABLE amazon_transactions 
ADD CONSTRAINT amazon_transactions_transaction_id_key UNIQUE (transaction_id);