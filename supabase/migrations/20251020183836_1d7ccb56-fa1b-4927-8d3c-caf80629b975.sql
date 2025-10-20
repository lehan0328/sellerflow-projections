-- Update existing amazon_payouts to have the correct account_id from their amazon_accounts
UPDATE amazon_payouts ap
SET account_id = aa.account_id
FROM amazon_accounts aa
WHERE ap.amazon_account_id = aa.id
  AND ap.account_id IS NULL;