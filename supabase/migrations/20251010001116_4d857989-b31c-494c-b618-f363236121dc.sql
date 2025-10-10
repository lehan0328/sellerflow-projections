-- Add payout_frequency column to amazon_accounts table
ALTER TABLE amazon_accounts
ADD COLUMN IF NOT EXISTS payout_frequency text NOT NULL DEFAULT 'bi-weekly' CHECK (payout_frequency IN ('daily', 'bi-weekly'));