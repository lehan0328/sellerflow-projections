-- Add unique constraint to prevent duplicate forecasted payouts per account per day
-- First, clean up existing duplicates by keeping only the most recent one per account/date
DELETE FROM amazon_payouts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY amazon_account_id, payout_date, status 
        ORDER BY created_at DESC
      ) as rn
    FROM amazon_payouts
    WHERE status = 'forecasted'
  ) t
  WHERE rn > 1
);

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS unique_forecasted_payout_per_account_date 
ON amazon_payouts (amazon_account_id, payout_date, status) 
WHERE status = 'forecasted';