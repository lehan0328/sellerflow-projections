-- Add is_admin field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- RLS policies for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view their own support tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create their own support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (only message field for adding info)
CREATE POLICY "Users can update their own support tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins can update all tickets
CREATE POLICY "Admins can update all support tickets"
ON public.support_tickets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins can delete tickets
CREATE POLICY "Admins can delete support tickets"
ON public.support_tickets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create ticket_messages table for conversation history
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

-- RLS policies for ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their tickets (excluding internal notes)
CREATE POLICY "Users can view their ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
  AND is_internal = false
);

-- Users can create messages for their tickets
CREATE POLICY "Users can create messages for their tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

-- Admins can view all messages (including internal)
CREATE POLICY "Admins can view all ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins can create messages
CREATE POLICY "Admins can create ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);