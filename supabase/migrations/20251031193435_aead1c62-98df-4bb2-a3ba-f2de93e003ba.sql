-- Set trial_end to yesterday for orders@imarand.com to display trial expired modal
UPDATE profiles 
SET trial_end = (NOW() - INTERVAL '1 day')::timestamp
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'orders@imarand.com');