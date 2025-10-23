-- Create trigger to automatically update bank account balance when transactions change
CREATE OR REPLACE FUNCTION update_bank_balance_on_transaction_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update bank account balance
  IF TG_OP = 'DELETE' THEN
    UPDATE bank_accounts
    SET 
      balance = calculate_bank_account_balance(OLD.bank_account_id),
      available_balance = calculate_bank_account_balance(OLD.bank_account_id),
      updated_at = NOW()
    WHERE id = OLD.bank_account_id;
    RETURN OLD;
  ELSE
    UPDATE bank_accounts
    SET 
      balance = calculate_bank_account_balance(NEW.bank_account_id),
      available_balance = calculate_bank_account_balance(NEW.bank_account_id),
      updated_at = NOW()
    WHERE id = NEW.bank_account_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_update_bank_balance_on_insert
AFTER INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_on_transaction_change();

-- Create trigger for UPDATE operations
CREATE TRIGGER trigger_update_bank_balance_on_update
AFTER UPDATE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_on_transaction_change();

-- Create trigger for DELETE operations
CREATE TRIGGER trigger_update_bank_balance_on_delete
AFTER DELETE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_on_transaction_change();

-- Create similar triggers for credit card transactions
CREATE OR REPLACE FUNCTION update_credit_card_balance_on_transaction_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update credit card balance
  IF TG_OP = 'DELETE' THEN
    UPDATE credit_cards
    SET 
      balance = calculate_credit_card_balance(OLD.credit_card_id),
      available_credit = credit_limit - calculate_credit_card_balance(OLD.credit_card_id),
      updated_at = NOW()
    WHERE id = OLD.credit_card_id;
    RETURN OLD;
  ELSE
    UPDATE credit_cards
    SET 
      balance = calculate_credit_card_balance(NEW.credit_card_id),
      available_credit = credit_limit - calculate_credit_card_balance(NEW.credit_card_id),
      updated_at = NOW()
    WHERE id = NEW.credit_card_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for credit card INSERT operations
CREATE TRIGGER trigger_update_credit_card_balance_on_insert
AFTER INSERT ON bank_transactions
FOR EACH ROW
WHEN (NEW.credit_card_id IS NOT NULL)
EXECUTE FUNCTION update_credit_card_balance_on_transaction_change();

-- Create trigger for credit card UPDATE operations
CREATE TRIGGER trigger_update_credit_card_balance_on_update
AFTER UPDATE ON bank_transactions
FOR EACH ROW
WHEN (NEW.credit_card_id IS NOT NULL)
EXECUTE FUNCTION update_credit_card_balance_on_transaction_change();

-- Create trigger for credit card DELETE operations
CREATE TRIGGER trigger_update_credit_card_balance_on_delete
AFTER DELETE ON bank_transactions
FOR EACH ROW
WHEN (OLD.credit_card_id IS NOT NULL)
EXECUTE FUNCTION update_credit_card_balance_on_transaction_change();