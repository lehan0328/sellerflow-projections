-- Add unique constraint to prevent duplicate Amazon transactions
-- First, clean up existing duplicates by keeping only the oldest record (by created_at) for each transaction_id
DELETE FROM amazon_transactions a
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY created_at ASC) as rn
    FROM amazon_transactions
  ) t
  WHERE t.rn > 1
);

-- Add unique constraint on transaction_id to prevent future duplicates
ALTER TABLE amazon_transactions
ADD CONSTRAINT amazon_transactions_transaction_id_unique UNIQUE (transaction_id);