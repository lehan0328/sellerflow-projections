-- Sync payout_model with payout_frequency for all Amazon accounts
UPDATE amazon_accounts
SET payout_model = payout_frequency
WHERE payout_model != payout_frequency OR payout_model IS NULL;