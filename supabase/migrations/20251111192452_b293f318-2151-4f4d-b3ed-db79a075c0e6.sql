-- Fix the notify_customer_on_staff_response trigger to get account_id from profiles
CREATE OR REPLACE FUNCTION notify_customer_on_staff_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_user_id UUID;
  v_ticket_subject TEXT;
  v_account_id UUID;
BEGIN
  -- Get the ticket owner's user_id and subject
  SELECT user_id, subject INTO v_ticket_user_id, v_ticket_subject
  FROM support_tickets
  WHERE id = NEW.ticket_id;
  
  -- Get account_id from profiles table
  SELECT account_id INTO v_account_id
  FROM profiles
  WHERE user_id = v_ticket_user_id;
  
  -- Only notify if the message is from staff (not from the ticket owner)
  IF NEW.user_id != v_ticket_user_id THEN
    -- Insert notification for the customer
    INSERT INTO notification_history (
      user_id,
      account_id,
      notification_type,
      category,
      title,
      message,
      read,
      priority,
      actionable,
      action_url
    ) VALUES (
      v_ticket_user_id,
      v_account_id,
      'info',
      'support',
      'Support Response Received',
      'Our support team has responded to your ticket: "' || v_ticket_subject || '"',
      false,
      'high',
      true,
      '/support'
    );
  END IF;
  
  RETURN NEW;
END;
$$;