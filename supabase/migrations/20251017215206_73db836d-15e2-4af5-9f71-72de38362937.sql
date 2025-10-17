-- Grant affiliate access to chuandy914@gmail.com
INSERT INTO public.affiliates (
  user_id,
  affiliate_code,
  status,
  tier,
  commission_rate,
  company_name,
  audience_description,
  promotional_methods,
  approved_at
)
SELECT 
  id,
  'CHUANDY914',
  'approved',
  'starter',
  20,
  'Test Company',
  'Testing affiliate portal functionality',
  'Direct promotion',
  NOW()
FROM auth.users
WHERE email = 'chuandy914@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'approved',
  approved_at = NOW();