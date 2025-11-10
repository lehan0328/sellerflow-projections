-- Drop the trigger first
DROP TRIGGER IF EXISTS on_customer_message_created ON ticket_messages;
DROP TRIGGER IF EXISTS update_ticket_on_customer_message ON ticket_messages;

-- Drop the function
DROP FUNCTION IF EXISTS update_ticket_on_customer_message();

-- Create improved function that handles both customer and admin messages
CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_user_id UUID;
BEGIN
  -- Get the ticket owner's user_id
  SELECT user_id INTO v_ticket_user_id
  FROM support_tickets
  WHERE id = NEW.ticket_id;
  
  -- If message is from the ticket owner (customer), set to needs_response
  IF NEW.user_id = v_ticket_user_id THEN
    UPDATE support_tickets
    SET status = 'needs_response',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  
  -- If message is from someone else (admin), set to open (awaiting customer response)
  ELSE
    UPDATE support_tickets
    SET status = 'open',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after message insert
CREATE TRIGGER update_ticket_status_on_message_trigger
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_on_message();