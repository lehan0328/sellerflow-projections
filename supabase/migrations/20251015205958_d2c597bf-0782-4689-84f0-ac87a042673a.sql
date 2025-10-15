-- Reset the referred user discount for testing
UPDATE profiles 
SET plan_override = 'referred_user_discount',
    discount_redeemed_at = NULL
WHERE user_id = '2a9ff062-c56f-43d0-88f6-f2fb818ebe74';