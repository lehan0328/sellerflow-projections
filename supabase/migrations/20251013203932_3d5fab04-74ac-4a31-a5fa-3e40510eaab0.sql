-- Create categories table for managing expense and income categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Account members can view categories"
ON public.categories FOR SELECT
USING (user_belongs_to_account(account_id));

CREATE POLICY "Account members can create categories"
ON public.categories FOR INSERT
WITH CHECK (user_belongs_to_account(account_id));

CREATE POLICY "Account members can update categories"
ON public.categories FOR UPDATE
USING (user_belongs_to_account(account_id));

CREATE POLICY "Account members can delete non-default categories"
ON public.categories FOR DELETE
USING (user_belongs_to_account(account_id) AND is_default = false);

-- Insert default expense categories
INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Inventory', 'expense', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Shipping', 'expense', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Marketing', 'expense', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Software', 'expense', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Other', 'expense', true FROM auth.users
ON CONFLICT DO NOTHING;

-- Insert default income categories
INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Sales', 'income', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Services', 'income', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name, type, is_default)
SELECT id, 'Other Income', 'income', true FROM auth.users
ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();