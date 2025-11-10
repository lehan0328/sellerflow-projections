-- Enable RLS on ticket_messages
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view messages on their own tickets
CREATE POLICY "Users can view their own ticket messages"
ON ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Allow website admins to view all ticket messages
CREATE POLICY "Website admins can view all ticket messages"
ON ticket_messages
FOR SELECT
USING (is_website_admin());

-- Allow users to insert messages on their own tickets
CREATE POLICY "Users can insert messages on their own tickets"
ON ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Allow website admins to insert messages on any ticket
CREATE POLICY "Website admins can insert messages on any ticket"
ON ticket_messages
FOR INSERT
WITH CHECK (is_website_admin());