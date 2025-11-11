-- Remove notification insertions from support ticket triggers

-- Update function to not notify customer when staff responds to their ticket
CREATE OR REPLACE FUNCTION notify_customer_on_staff_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function kept for compatibility but no longer sends notifications
  RETURN NEW;
END;
$$;

-- Update function to not notify customer when their ticket is closed
CREATE OR REPLACE FUNCTION notify_customer_on_ticket_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function kept for compatibility but no longer sends notifications
  RETURN NEW;
END;
$$;