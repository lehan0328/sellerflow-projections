-- Add column to track when admin last viewed ticket messages
ALTER TABLE support_tickets 
ADD COLUMN admin_last_viewed_at timestamp with time zone;

-- Create index for better performance on queries
CREATE INDEX idx_support_tickets_admin_viewed ON support_tickets(id, admin_last_viewed_at);

-- Create index on ticket_messages for efficient counting
CREATE INDEX idx_ticket_messages_ticket_user_created ON ticket_messages(ticket_id, user_id, created_at);