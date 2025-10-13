-- Fix default categories to include account_id
-- Update existing default categories to have the account_id from profiles
UPDATE public.categories c
SET account_id = p.account_id
FROM public.profiles p
WHERE c.user_id = p.user_id
  AND c.is_default = true
  AND c.account_id IS NULL;

-- Add trigger to automatically set account_id for categories if not provided
CREATE TRIGGER set_categories_account_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_account_id_from_user();

-- For any future users, ensure default categories are created with account_id
-- This will be handled by the trigger above, but we'll also update the migration inserts

-- Re-insert default categories for existing users who don't have them (with account_id this time)
INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Inventory', 'expense', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Inventory' 
  AND c.type = 'expense'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Shipping', 'expense', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Shipping' 
  AND c.type = 'expense'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Marketing', 'expense', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Marketing' 
  AND c.type = 'expense'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Software', 'expense', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Software' 
  AND c.type = 'expense'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Other', 'expense', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Other' 
  AND c.type = 'expense'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Sales', 'income', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Sales' 
  AND c.type = 'income'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Services', 'income', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Services' 
  AND c.type = 'income'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, account_id, name, type, is_default)
SELECT p.user_id, p.account_id, 'Other Income', 'income', true 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.user_id = p.user_id 
  AND c.name = 'Other Income' 
  AND c.type = 'income'
)
ON CONFLICT DO NOTHING;