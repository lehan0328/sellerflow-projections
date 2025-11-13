-- Update default categories function to move Inventory from expense to purchase_order
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default expense categories (non-recurring) - removed Inventory
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Utilities', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Shipping', 'expense', true, false)
  ON CONFLICT DO NOTHING;
  
  -- Insert default purchase order categories - added Inventory here
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Inventory', 'purchase_order', true, false),
    (NEW.user_id, NEW.account_id, 'Equipment', 'purchase_order', true, false),
    (NEW.user_id, NEW.account_id, 'Supplies', 'purchase_order', true, false)
  ON CONFLICT DO NOTHING;

  -- Insert default income categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Sales', 'income', true, false),
    (NEW.user_id, NEW.account_id, 'Services', 'income', true, false)
  ON CONFLICT DO NOTHING;

  -- Insert default recurring expense categories
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Payroll', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Software', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Loan', 'expense', true, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;