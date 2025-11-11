-- Fix accounts incorrectly marked as suspended_payment when they never had a paid subscription
-- Reset all suspended_payment accounts to trial_expired since the webhook now handles this correctly

UPDATE profiles
SET account_status = 'trial_expired'
WHERE account_status = 'suspended_payment';