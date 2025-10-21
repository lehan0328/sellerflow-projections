-- Add is_recurring column to categories table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Add default recurring expense categories
-- Only insert if they don't already exist (to avoid duplicates on migration re-runs)
INSERT INTO public.categories (name, type, is_default, is_recurring, user_id)
SELECT 'Payroll', 'expense', true, true, auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Payroll' AND type = 'expense' AND is_default = true AND is_recurring = true
)
AND auth.uid() IS NOT NULL;

INSERT INTO public.categories (name, type, is_default, is_recurring, user_id)
SELECT 'Software', 'expense', true, true, auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Software' AND type = 'expense' AND is_default = true AND is_recurring = true
)
AND auth.uid() IS NOT NULL;

INSERT INTO public.categories (name, type, is_default, is_recurring, user_id)
SELECT 'Loan', 'expense', true, true, auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Loan' AND type = 'expense' AND is_default = true AND is_recurring = true
)
AND auth.uid() IS NOT NULL;