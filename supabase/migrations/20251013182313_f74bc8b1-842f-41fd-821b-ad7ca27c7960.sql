-- Add check constraint for support ticket status including needs_response
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check 
  CHECK (status IN ('open', 'in_progress', 'needs_response', 'resolved', 'closed'));

-- Create function to update ticket status when customer replies
CREATE OR REPLACE FUNCTION update_ticket_on_customer_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if message is from the ticket owner (not admin) and ticket is not closed
  IF NEW.user_id = (SELECT user_id FROM support_tickets WHERE id = NEW.ticket_id) THEN
    UPDATE support_tickets
    SET status = 'needs_response',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update ticket status on customer message
DROP TRIGGER IF EXISTS on_customer_message_created ON ticket_messages;
CREATE TRIGGER on_customer_message_created
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_on_customer_message();