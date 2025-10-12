
-- Fix the user's account by completing their team invitation
-- User: nydripkicks1@gmail.com
-- They were invited to account: 54ca6953-5f8b-4104-b5bc-470b30c2b6f3
-- But got stuck with their own account: 7095357a-1614-40fc-9974-24875d3ed1bc

DO $$
DECLARE
  v_user_id UUID;
  v_invited_account_id UUID := '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';
  v_old_account_id UUID := '7095357a-1614-40fc-9974-24875d3ed1bc';
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'nydripkicks1@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;

  -- Update the user's profile to join the invited account
  UPDATE profiles
  SET 
    account_id = v_invited_account_id,
    is_account_owner = false,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- Create user role for the invited account
  INSERT INTO user_roles (user_id, account_id, role)
  VALUES (v_user_id, v_invited_account_id, 'staff')
  ON CONFLICT (user_id, account_id) DO NOTHING;

  -- Mark the invitation as accepted
  UPDATE team_invitations
  SET accepted_at = now()
  WHERE email = 'nydripkicks1@gmail.com' 
    AND account_id = v_invited_account_id
    AND accepted_at IS NULL;

  -- Delete the orphaned account and role that was auto-created
  DELETE FROM user_roles 
  WHERE user_id = v_user_id AND account_id = v_old_account_id;

  RAISE NOTICE 'Successfully fixed user account';
END $$;
