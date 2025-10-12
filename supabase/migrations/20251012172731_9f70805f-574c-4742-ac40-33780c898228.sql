
-- Fix account_id column types and create proper team data sharing

-- Drop the TEXT account_id column from bank_accounts if it exists
ALTER TABLE bank_accounts DROP COLUMN IF EXISTS account_id CASCADE;

-- Add account_id as UUID to all tables that need it
ALTER TABLE bank_accounts ADD COLUMN account_id UUID;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE income ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE amazon_transactions ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE amazon_payouts ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE cash_flow_events ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE cash_flow_insights ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE documents_metadata ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS account_id UUID;

-- Populate account_id for existing records based on user's profile
UPDATE bank_accounts SET account_id = (SELECT account_id FROM profiles WHERE user_id = bank_accounts.user_id) WHERE account_id IS NULL;
UPDATE amazon_accounts SET account_id = (SELECT account_id FROM profiles WHERE user_id = amazon_accounts.user_id) WHERE account_id IS NULL;
UPDATE credit_cards SET account_id = (SELECT account_id FROM profiles WHERE user_id = credit_cards.user_id) WHERE account_id IS NULL;
UPDATE transactions SET account_id = (SELECT account_id FROM profiles WHERE user_id = transactions.user_id) WHERE account_id IS NULL;
UPDATE customers SET account_id = (SELECT account_id FROM profiles WHERE user_id = customers.user_id) WHERE account_id IS NULL;
UPDATE vendors SET account_id = (SELECT account_id FROM profiles WHERE user_id = vendors.user_id) WHERE account_id IS NULL;
UPDATE income SET account_id = (SELECT account_id FROM profiles WHERE user_id = income.user_id) WHERE account_id IS NULL;
UPDATE recurring_expenses SET account_id = (SELECT account_id FROM profiles WHERE user_id = recurring_expenses.user_id) WHERE account_id IS NULL;
UPDATE bank_transactions SET account_id = (SELECT account_id FROM profiles WHERE user_id = bank_transactions.user_id) WHERE account_id IS NULL;
UPDATE amazon_transactions SET account_id = (SELECT account_id FROM profiles WHERE user_id = amazon_transactions.user_id) WHERE account_id IS NULL;
UPDATE amazon_payouts SET account_id = (SELECT account_id FROM profiles WHERE user_id = amazon_payouts.user_id) WHERE account_id IS NULL;
UPDATE cash_flow_events SET account_id = (SELECT account_id FROM profiles WHERE user_id = cash_flow_events.user_id) WHERE account_id IS NULL;
UPDATE cash_flow_insights SET account_id = (SELECT account_id FROM profiles WHERE user_id = cash_flow_insights.user_id) WHERE account_id IS NULL;
UPDATE scenarios SET account_id = (SELECT account_id FROM profiles WHERE user_id = scenarios.user_id) WHERE account_id IS NULL;
UPDATE documents_metadata SET account_id = (SELECT account_id FROM profiles WHERE user_id = documents_metadata.user_id) WHERE account_id IS NULL;
UPDATE notification_preferences SET account_id = (SELECT account_id FROM profiles WHERE user_id = notification_preferences.user_id) WHERE account_id IS NULL;
UPDATE notification_history SET account_id = (SELECT account_id FROM profiles WHERE user_id = notification_history.user_id) WHERE account_id IS NULL;

-- Create helper function to check if user belongs to an account
CREATE OR REPLACE FUNCTION user_belongs_to_account(_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()
    AND account_id = _account_id
  );
$$;

-- Drop existing user-based policies
DROP POLICY IF EXISTS "Users can view own bank accounts only" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts only" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts only" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts only" ON bank_accounts;

DROP POLICY IF EXISTS "Users can view their own Amazon accounts" ON amazon_accounts;
DROP POLICY IF EXISTS "Users can create their own Amazon accounts" ON amazon_accounts;
DROP POLICY IF EXISTS "Users can update their own Amazon accounts" ON amazon_accounts;
DROP POLICY IF EXISTS "Users can delete their own Amazon accounts" ON amazon_accounts;

DROP POLICY IF EXISTS "Users can view their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can create their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete their own credit cards" ON credit_cards;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
DROP POLICY IF EXISTS "Users can create their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

DROP POLICY IF EXISTS "Users can view their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can create their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can update their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can delete their own vendors" ON vendors;

DROP POLICY IF EXISTS "Users can view their own income" ON income;
DROP POLICY IF EXISTS "Users can create their own income" ON income;
DROP POLICY IF EXISTS "Users can update their own income" ON income;
DROP POLICY IF EXISTS "Users can delete their own income" ON income;

DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can create their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can insert their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can update their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can delete their own bank transactions" ON bank_transactions;

DROP POLICY IF EXISTS "Users can view their own Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Users can create their own Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Users can update their own Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Users can delete their own Amazon transactions" ON amazon_transactions;

DROP POLICY IF EXISTS "Users can view their own Amazon payouts" ON amazon_payouts;
DROP POLICY IF EXISTS "Users can create their own Amazon payouts" ON amazon_payouts;
DROP POLICY IF EXISTS "Users can update their own Amazon payouts" ON amazon_payouts;
DROP POLICY IF EXISTS "Users can delete their own Amazon payouts" ON amazon_payouts;

DROP POLICY IF EXISTS "Users can view their own cash flow events" ON cash_flow_events;
DROP POLICY IF EXISTS "Users can create their own cash flow events" ON cash_flow_events;
DROP POLICY IF EXISTS "Users can update their own cash flow events" ON cash_flow_events;
DROP POLICY IF EXISTS "Users can delete their own cash flow events" ON cash_flow_events;

DROP POLICY IF EXISTS "Users can view their own insights" ON cash_flow_insights;
DROP POLICY IF EXISTS "Users can insert their own insights" ON cash_flow_insights;
DROP POLICY IF EXISTS "Users can update their own insights" ON cash_flow_insights;

DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can create their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can update their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can delete their own scenarios" ON scenarios;

DROP POLICY IF EXISTS "Users can view their own document metadata" ON documents_metadata;
DROP POLICY IF EXISTS "Users can create their own document metadata" ON documents_metadata;
DROP POLICY IF EXISTS "Users can update their own document metadata" ON documents_metadata;
DROP POLICY IF EXISTS "Users can delete their own document metadata" ON documents_metadata;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can create their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;

DROP POLICY IF EXISTS "Users can view their own notification history" ON notification_history;
DROP POLICY IF EXISTS "Users can update their own notification history" ON notification_history;
DROP POLICY IF EXISTS "Users can delete their own notification history" ON notification_history;

-- Create account-based policies for all tables (using condensed approach for brevity)
-- Bank accounts
CREATE POLICY "Account members can view bank accounts" ON bank_accounts FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create bank accounts" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update bank accounts" ON bank_accounts FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete bank accounts" ON bank_accounts FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Amazon accounts
CREATE POLICY "Account members can view Amazon accounts" ON amazon_accounts FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create Amazon accounts" ON amazon_accounts FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update Amazon accounts" ON amazon_accounts FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete Amazon accounts" ON amazon_accounts FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Credit cards
CREATE POLICY "Account members can view credit cards" ON credit_cards FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create credit cards" ON credit_cards FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update credit cards" ON credit_cards FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete credit cards" ON credit_cards FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Transactions
CREATE POLICY "Account members can view transactions" ON transactions FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update transactions" ON transactions FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete transactions" ON transactions FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Customers
CREATE POLICY "Account members can view customers" ON customers FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create customers" ON customers FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update customers" ON customers FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete customers" ON customers FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Vendors
CREATE POLICY "Account members can view vendors" ON vendors FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create vendors" ON vendors FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update vendors" ON vendors FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete vendors" ON vendors FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Income
CREATE POLICY "Account members can view income" ON income FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create income" ON income FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update income" ON income FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete income" ON income FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Recurring expenses
CREATE POLICY "Account members can view recurring expenses" ON recurring_expenses FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create recurring expenses" ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update recurring expenses" ON recurring_expenses FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete recurring expenses" ON recurring_expenses FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Bank transactions
CREATE POLICY "Account members can view bank transactions" ON bank_transactions FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create bank transactions" ON bank_transactions FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update bank transactions" ON bank_transactions FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete bank transactions" ON bank_transactions FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Amazon transactions
CREATE POLICY "Account members can view Amazon transactions" ON amazon_transactions FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create Amazon transactions" ON amazon_transactions FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update Amazon transactions" ON amazon_transactions FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete Amazon transactions" ON amazon_transactions FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Amazon payouts
CREATE POLICY "Account members can view Amazon payouts" ON amazon_payouts FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create Amazon payouts" ON amazon_payouts FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update Amazon payouts" ON amazon_payouts FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete Amazon payouts" ON amazon_payouts FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Cash flow events
CREATE POLICY "Account members can view cash flow events" ON cash_flow_events FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create cash flow events" ON cash_flow_events FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update cash flow events" ON cash_flow_events FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete cash flow events" ON cash_flow_events FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Cash flow insights
CREATE POLICY "Account members can view insights" ON cash_flow_insights FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create insights" ON cash_flow_insights FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update insights" ON cash_flow_insights FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));

-- Scenarios
CREATE POLICY "Account members can view scenarios" ON scenarios FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create scenarios" ON scenarios FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update scenarios" ON scenarios FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete scenarios" ON scenarios FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Documents
CREATE POLICY "Account members can view documents" ON documents_metadata FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create documents" ON documents_metadata FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update documents" ON documents_metadata FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete documents" ON documents_metadata FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Notification preferences
CREATE POLICY "Account members can view notification preferences" ON notification_preferences FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can create notification preferences" ON notification_preferences FOR INSERT TO authenticated WITH CHECK (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update notification preferences" ON notification_preferences FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete notification preferences" ON notification_preferences FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Notification history
CREATE POLICY "Account members can view notification history" ON notification_history FOR SELECT TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can update notification history" ON notification_history FOR UPDATE TO authenticated USING (user_belongs_to_account(account_id));
CREATE POLICY "Account members can delete notification history" ON notification_history FOR DELETE TO authenticated USING (user_belongs_to_account(account_id));

-- Create trigger function to automatically set account_id on insert
CREATE OR REPLACE FUNCTION set_account_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_id IS NULL THEN
    NEW.account_id := (SELECT account_id FROM profiles WHERE user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for all tables
CREATE TRIGGER set_bank_accounts_account_id BEFORE INSERT ON bank_accounts FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_amazon_accounts_account_id BEFORE INSERT ON amazon_accounts FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_credit_cards_account_id BEFORE INSERT ON credit_cards FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_transactions_account_id BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_customers_account_id BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_vendors_account_id BEFORE INSERT ON vendors FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_income_account_id BEFORE INSERT ON income FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_recurring_expenses_account_id BEFORE INSERT ON recurring_expenses FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_bank_transactions_account_id BEFORE INSERT ON bank_transactions FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_amazon_transactions_account_id BEFORE INSERT ON amazon_transactions FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_amazon_payouts_account_id BEFORE INSERT ON amazon_payouts FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_cash_flow_events_account_id BEFORE INSERT ON cash_flow_events FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_cash_flow_insights_account_id BEFORE INSERT ON cash_flow_insights FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_scenarios_account_id BEFORE INSERT ON scenarios FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_documents_metadata_account_id BEFORE INSERT ON documents_metadata FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_notification_preferences_account_id BEFORE INSERT ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
CREATE TRIGGER set_notification_history_account_id BEFORE INSERT ON notification_history FOR EACH ROW EXECUTE FUNCTION set_account_id_from_user();
