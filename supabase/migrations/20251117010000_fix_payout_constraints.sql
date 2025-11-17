-- Remove the restrictive constraint that prevents multiple payouts per day
ALTER TABLE amazon_payouts
DROP CONSTRAINT IF EXISTS unique_payout_account_date_status;

-- Ensure the correct constraint exists (in case the previous migration didn't apply cleanly)
-- This allows multiple payouts per day as long as they have different settlement_ids
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_amazon_payout_settlement'
    ) THEN
        ALTER TABLE amazon_payouts
        ADD CONSTRAINT unique_amazon_payout_settlement 
        UNIQUE (amazon_account_id, settlement_id);
    END IF;
END $$;