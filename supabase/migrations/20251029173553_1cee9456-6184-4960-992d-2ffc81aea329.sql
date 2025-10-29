-- Delete all Amazon data for chuandy914@gmail.com
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'chuandy914@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;

  -- Delete amazon_transactions
  DELETE FROM amazon_transactions 
  WHERE amazon_account_id IN (
    SELECT id FROM amazon_accounts WHERE user_id = v_user_id
  );

  -- Delete amazon_payouts
  DELETE FROM amazon_payouts
  WHERE amazon_account_id IN (
    SELECT id FROM amazon_accounts WHERE user_id = v_user_id
  );

  -- Delete amazon_accounts
  DELETE FROM amazon_accounts WHERE user_id = v_user_id;

  RAISE NOTICE 'Successfully deleted all Amazon data for user %', v_user_id;
END $$;