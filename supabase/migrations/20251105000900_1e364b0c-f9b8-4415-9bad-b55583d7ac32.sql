-- Update RLS policy to allow deletion of default categories
DROP POLICY IF EXISTS "Account members can delete non-default categories" ON categories;

CREATE POLICY "Account members can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (user_belongs_to_account(account_id));

-- Update default categories function to remove Software and Payroll from regular expenses
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default expense categories (non-recurring) - removed Software and Payroll
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Inventory', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Marketing', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Shipping', 'expense', true, false);
  
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