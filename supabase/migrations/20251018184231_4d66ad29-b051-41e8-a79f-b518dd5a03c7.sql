-- Add category column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Clean up duplicate customer names by appending numbers
WITH duplicates AS (
  SELECT id, name, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(name) ORDER BY created_at) as rn
  FROM public.customers
)
UPDATE public.customers c
SET name = c.name || ' (' || d.rn || ')'
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;

-- Clean up duplicate vendor names
WITH duplicates AS (
  SELECT id, name, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(name) ORDER BY created_at) as rn
  FROM public.vendors
)
UPDATE public.vendors v
SET name = v.name || ' (' || d.rn || ')'
FROM duplicates d
WHERE v.id = d.id AND d.rn > 1;

-- Clean up duplicate recurring expense names
WITH duplicates AS (
  SELECT id, name, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(name) ORDER BY created_at) as rn
  FROM public.recurring_expenses
)
UPDATE public.recurring_expenses r
SET name = r.name || ' (' || d.rn || ')'
FROM duplicates d
WHERE r.id = d.id AND d.rn > 1;

-- Now add unique constraints to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_name_unique 
ON public.customers (user_id, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS vendors_user_name_unique 
ON public.vendors (user_id, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS recurring_expenses_user_name_unique 
ON public.recurring_expenses (user_id, LOWER(name));