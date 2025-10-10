-- Add 'forecasted' status to amazon_payouts status field
-- First, update the check constraint to allow 'forecasted' status
ALTER TABLE amazon_payouts 
DROP CONSTRAINT IF EXISTS amazon_payouts_status_check;

ALTER TABLE amazon_payouts 
ADD CONSTRAINT amazon_payouts_status_check 
CHECK (status IN ('confirmed', 'estimated', 'processing', 'forecasted'));