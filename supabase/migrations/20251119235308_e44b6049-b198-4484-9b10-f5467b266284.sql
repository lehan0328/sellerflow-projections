-- Clean up duplicate credit card payments
-- Keep only the oldest record for each unique combination
DELETE FROM credit_card_payments
WHERE id NOT IN (
  SELECT DISTINCT ON (credit_card_id, payment_date, payment_type) id
  FROM credit_card_payments
  ORDER BY credit_card_id, payment_date, payment_type, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE credit_card_payments 
ADD CONSTRAINT unique_credit_card_payment 
UNIQUE (credit_card_id, payment_date, payment_type);