-- Drop unused tables from reports-based sync (now using settlements only)

-- Drop amazon_transactions_daily_summary table
DROP TABLE IF EXISTS public.amazon_transactions_daily_summary CASCADE;

-- Drop amazon_transactions table  
DROP TABLE IF EXISTS public.amazon_transactions CASCADE;

-- Add comment explaining the change
COMMENT ON TABLE public.amazon_payouts IS 'Stores Amazon settlement payouts. This is the primary source for Amazon revenue data (net payouts that hit bank account). Replaces old amazon_transactions system.';