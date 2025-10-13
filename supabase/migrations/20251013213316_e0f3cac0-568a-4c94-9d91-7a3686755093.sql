-- Add payment_method column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank-transfer' CHECK (payment_method IN ('bank-transfer', 'credit-card'));