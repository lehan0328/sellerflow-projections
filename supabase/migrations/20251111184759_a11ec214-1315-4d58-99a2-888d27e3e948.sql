-- Create ticket_feedback table to track customer satisfaction ratings
CREATE TABLE IF NOT EXISTS public.ticket_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create feedback for their own tickets
CREATE POLICY "Users can create their own feedback"
ON public.ticket_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.ticket_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins and staff can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.ticket_feedback
FOR SELECT
USING (is_admin_staff());

-- Create index for faster lookups
CREATE INDEX idx_ticket_feedback_staff_id ON public.ticket_feedback(staff_id);
CREATE INDEX idx_ticket_feedback_ticket_id ON public.ticket_feedback(ticket_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ticket_feedback_updated_at
  BEFORE UPDATE ON public.ticket_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();