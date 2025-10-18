-- Create function to insert default categories for new accounts
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default expense categories
  INSERT INTO public.categories (user_id, account_id, name, type, is_default)
  VALUES
    (NEW.user_id, NEW.account_id, 'Inventory', 'expense', true),
    (NEW.user_id, NEW.account_id, 'Marketing', 'expense', true),
    (NEW.user_id, NEW.account_id, 'Shipping', 'expense', true),
    (NEW.user_id, NEW.account_id, 'Software', 'expense', true),
    (NEW.user_id, NEW.account_id, 'Payroll', 'expense', true);
  
  -- Insert default income categories
  INSERT INTO public.categories (user_id, account_id, name, type, is_default)
  VALUES
    (NEW.user_id, NEW.account_id, 'Sales', 'income', true),
    (NEW.user_id, NEW.account_id, 'Service', 'income', true),
    (NEW.user_id, NEW.account_id, 'Other Income', 'income', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after profile insert
CREATE TRIGGER create_default_categories_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories();