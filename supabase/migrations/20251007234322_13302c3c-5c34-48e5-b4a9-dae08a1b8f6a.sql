-- Enable realtime for safe spending related tables
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE income REPLICA IDENTITY FULL;
ALTER TABLE recurring_expenses REPLICA IDENTITY FULL;
ALTER TABLE bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE vendors REPLICA IDENTITY FULL;
ALTER TABLE amazon_payouts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE income;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE amazon_payouts;