-- Fix the trigger function to set search_path for security
CREATE OR REPLACE FUNCTION update_amazon_daily_draws_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;