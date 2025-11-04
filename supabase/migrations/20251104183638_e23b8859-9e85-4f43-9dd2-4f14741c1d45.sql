-- Add 'rolled_over' status to amazon_payouts for audit trail
ALTER TABLE amazon_payouts 
DROP CONSTRAINT IF EXISTS amazon_payouts_status_check;

ALTER TABLE amazon_payouts 
ADD CONSTRAINT amazon_payouts_status_check 
CHECK (status IN ('confirmed', 'forecasted', 'estimated', 'rolled_over'));