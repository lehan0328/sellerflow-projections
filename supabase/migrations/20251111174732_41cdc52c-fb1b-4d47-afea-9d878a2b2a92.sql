-- This is a one-time fix to create the missing auth user for chuandy11111@gmail.com
-- Note: This SQL is for documentation only - the actual user creation must be done via Supabase Auth Admin API
-- The user should be created through the Supabase dashboard at:
-- https://supabase.com/dashboard/project/ruvdqtqyfzaxlobmxgaj/auth/users

-- Reset the admin_permissions record so the user can complete signup again
UPDATE admin_permissions
SET 
  account_created = false,
  invitation_token = gen_random_uuid()::text,
  token_expires_at = NOW() + INTERVAL '7 days',
  updated_at = NOW()
WHERE email = 'chuandy11111@gmail.com';

-- Return the new token for the user to complete signup
SELECT email, invitation_token, token_expires_at 
FROM admin_permissions 
WHERE email = 'chuandy11111@gmail.com';