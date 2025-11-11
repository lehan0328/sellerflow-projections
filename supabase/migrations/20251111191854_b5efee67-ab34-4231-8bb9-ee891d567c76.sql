-- Add ticket_number column to support_tickets
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS ticket_number SERIAL;

-- Create a unique index on ticket_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_number 
ON support_tickets(ticket_number);

-- Update existing tickets with sequential numbers if they don't have them
DO $$
DECLARE
  ticket_record RECORD;
  counter INTEGER := 1000; -- Start from 1000 for ticket numbers
BEGIN
  FOR ticket_record IN 
    SELECT id FROM support_tickets 
    WHERE ticket_number IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE support_tickets 
    SET ticket_number = counter 
    WHERE id = ticket_record.id;
    counter := counter + 1;
  END LOOP;
END $$;