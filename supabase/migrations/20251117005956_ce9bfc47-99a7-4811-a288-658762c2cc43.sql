-- Add unique constraint to amazon_payouts table to support upsert operations
-- This prevents duplicate settlements for the same account

ALTER TABLE amazon_payouts
ADD CONSTRAINT unique_amazon_payout_settlement 
UNIQUE (amazon_account_id, settlement_id);