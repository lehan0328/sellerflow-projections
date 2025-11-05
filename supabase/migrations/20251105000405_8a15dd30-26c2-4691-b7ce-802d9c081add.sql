-- Drop and recreate the function to add default recurring expense categories
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default expense categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Inventory', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Marketing', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Shipping', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Software', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Payroll', 'expense', true, false);
  
  -- Insert default income categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Sales', 'income', true, false),
    (NEW.user_id, NEW.account_id, 'Service', 'income', true, false),
    (NEW.user_id, NEW.account_id, 'Other Income', 'income', true, false);
  
  -- Insert default recurring expense categories
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Loan', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Software', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Car', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Rent', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Employee', 'expense', true, true);
  
  RETURN NEW;
END;
$function$;