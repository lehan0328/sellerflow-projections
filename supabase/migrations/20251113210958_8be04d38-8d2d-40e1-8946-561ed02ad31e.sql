-- Create payees table for expense tracking (separate from vendors for POs)
CREATE TABLE public.payees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID,
  name TEXT NOT NULL,
  category TEXT,
  payment_method TEXT CHECK (payment_method IN ('bank-transfer', 'credit-card')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- Create policies for payees
CREATE POLICY "Account members can view payees"
ON public.payees
FOR SELECT
USING (user_belongs_to_account(account_id));

CREATE POLICY "Account members can create payees"
ON public.payees
FOR INSERT
WITH CHECK (user_belongs_to_account(account_id));

CREATE POLICY "Account members can update payees"
ON public.payees
FOR UPDATE
USING (user_belongs_to_account(account_id));

CREATE POLICY "Account members can delete payees"
ON public.payees
FOR DELETE
USING (user_belongs_to_account(account_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payees_updated_at
BEFORE UPDATE ON public.payees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_payees_account_id ON public.payees(account_id);
CREATE INDEX idx_payees_user_id ON public.payees(user_id);