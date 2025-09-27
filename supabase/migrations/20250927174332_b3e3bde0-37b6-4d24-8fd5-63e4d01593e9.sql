-- Create income table for persistent income tracking
CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'Manual Entry',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('received', 'pending', 'overdue')),
  category TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly', 'weekdays')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraint
  CONSTRAINT fk_income_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own income" 
ON public.income 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income" 
ON public.income 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income" 
ON public.income 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income" 
ON public.income 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_income_updated_at
BEFORE UPDATE ON public.income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_income_user_id ON public.income(user_id);
CREATE INDEX idx_income_payment_date ON public.income(payment_date);
CREATE INDEX idx_income_status ON public.income(status);