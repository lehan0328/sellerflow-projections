-- Create function to notify customer when staff responds to their ticket
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
  SELECT user_id, subject, account_id INTO v_ticket_user_id, v_ticket_subject, v_account_id
  FROM support_tickets
  WHERE id = NEW.ticket_id;
  
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

-- Create trigger on ticket_messages
DROP TRIGGER IF EXISTS trigger_notify_customer_response ON ticket_messages;
CREATE TRIGGER trigger_notify_customer_response
AFTER INSERT ON ticket_messages
FOR EACH ROW
EXECUTE FUNCTION notify_customer_on_staff_response();

-- Create function to notify customer when their ticket is closed
CREATE OR REPLACE FUNCTION notify_customer_on_ticket_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Only notify when status changes to closed or resolved
  IF (NEW.status = 'closed' OR NEW.status = 'resolved') 
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Get account_id from profiles
    SELECT account_id INTO v_account_id
    FROM profiles
    WHERE user_id = NEW.user_id;
    
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
      NEW.user_id,
      v_account_id,
      'info',
      'support',
      'Support Ticket Closed',
      'Your support ticket "' || NEW.subject || '" has been closed. If you need further assistance, please create a new ticket.',
      false,
      'medium',
      true,
      '/support'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on support_tickets
DROP TRIGGER IF EXISTS trigger_notify_customer_closed ON support_tickets;
CREATE TRIGGER trigger_notify_customer_closed
AFTER UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION notify_customer_on_ticket_closed();