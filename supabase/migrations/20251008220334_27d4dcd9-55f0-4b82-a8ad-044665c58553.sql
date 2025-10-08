-- Enable REPLICA IDENTITY FULL for safe spending related tables
-- This ensures complete row data is captured during updates for realtime
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.income REPLICA IDENTITY FULL;
ALTER TABLE public.recurring_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.vendors REPLICA IDENTITY FULL;
ALTER TABLE public.amazon_payouts REPLICA IDENTITY FULL;
ALTER TABLE public.user_settings REPLICA IDENTITY FULL;