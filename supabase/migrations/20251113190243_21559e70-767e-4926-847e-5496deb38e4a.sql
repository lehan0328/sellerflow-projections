-- Add default purchase order categories for existing users who don't have them yet
INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
SELECT 
  p.user_id, 
  p.account_id, 
  category_name,
  'purchase_order',
  true,
  false
FROM profiles p
CROSS JOIN (
  VALUES 
    ('Inventory'),
    ('Equipment'),
    ('Supplies')
) AS defaults(category_name)
WHERE NOT EXISTS (
  SELECT 1 
  FROM categories c 
  WHERE c.user_id = p.user_id 
    AND c.account_id = p.account_id
    AND c.name = defaults.category_name
    AND c.type = 'purchase_order'
)
ON CONFLICT DO NOTHING;