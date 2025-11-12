-- Fix admin access for users who created accounts before being invited
-- This updates vivenlin0914@gmail.com and any other existing users

UPDATE admin_permissions
SET account_created = true
WHERE email = 'vivenlin0914@gmail.com' AND account_created = false;

-- Add a comment explaining the issue for future reference
COMMENT ON COLUMN admin_permissions.account_created IS 
'Indicates if the invited admin/staff has created their auth account. 
Note: If a user creates an account BEFORE receiving an admin invitation, 
this flag must be manually set to true for them to access the admin dashboard.';