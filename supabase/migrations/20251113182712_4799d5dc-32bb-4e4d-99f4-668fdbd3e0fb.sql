-- Create table to track skipped/exception dates for recurring expenses
CREATE TABLE IF NOT EXISTS recurring_expense_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_expense_id, exception_date)
);

-- Enable RLS
ALTER TABLE recurring_expense_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Account members can view exceptions" 
  ON recurring_expense_exceptions FOR SELECT 
  USING (user_belongs_to_account(account_id));

CREATE POLICY "Account members can create exceptions" 
  ON recurring_expense_exceptions FOR INSERT 
  WITH CHECK (user_belongs_to_account(account_id));

CREATE POLICY "Account members can delete exceptions" 
  ON recurring_expense_exceptions FOR DELETE 
  USING (user_belongs_to_account(account_id));

-- Index for performance
CREATE INDEX idx_recurring_expense_exceptions_recurring_expense_id 
  ON recurring_expense_exceptions(recurring_expense_id);

CREATE INDEX idx_recurring_expense_exceptions_exception_date 
  ON recurring_expense_exceptions(exception_date);