-- Fix security warning: Set search_path for functions
ALTER FUNCTION calculate_bank_account_balance(UUID) SET search_path = public;
ALTER FUNCTION update_bank_account_balance() SET search_path = public;