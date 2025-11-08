-- Add credit_card_id column to recurring_expenses table
ALTER TABLE recurring_expenses
ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_recurring_expenses_credit_card_id ON recurring_expenses(credit_card_id);