-- Add admin role for daniel@levelbrands.com
INSERT INTO user_roles (user_id, role, account_id)
SELECT 
  '86474603-971a-4f99-8ed1-cb210994c7b0',
  'admin'::app_role,
  p.account_id
FROM profiles p
WHERE p.user_id = '86474603-971a-4f99-8ed1-cb210994c7b0'
ON CONFLICT (user_id, account_id) DO UPDATE SET role = 'admin'::app_role;

-- Create affiliate profile for daniel@levelbrands.com
INSERT INTO affiliates (
  user_id,
  affiliate_code,
  status,
  tier,
  commission_rate
)
VALUES (
  '86474603-971a-4f99-8ed1-cb210994c7b0',
  'LEVELBRANDS',
  'approved',
  'starter',
  15
)
ON CONFLICT (user_id) DO UPDATE SET
  status = 'approved',
  approved_at = NOW();