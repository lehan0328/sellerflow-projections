-- Add credit_card_id to transactions table to track which credit card was used
ALTER TABLE transactions
ADD COLUMN credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_transactions_credit_card_id ON transactions(credit_card_id);