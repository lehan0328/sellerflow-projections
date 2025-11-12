
-- Grant lifetime access to daniel@levelbrands.com
UPDATE profiles
SET plan_override = 'tier1',
    account_status = 'active'
WHERE email = 'daniel@levelbrands.com';
