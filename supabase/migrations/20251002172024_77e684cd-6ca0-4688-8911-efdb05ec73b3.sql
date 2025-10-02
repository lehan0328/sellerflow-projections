-- Clear all data before September 29, 2025 for the authenticated user
-- This ensures only data from 9/29/2025 onwards is retained

-- Delete transactions before 9/29/2025
DELETE FROM public.transactions
WHERE user_id = auth.uid()
AND transaction_date < '2025-09-29'::date;

-- Delete vendors with next payment dates before 9/29/2025
DELETE FROM public.vendors
WHERE user_id = auth.uid()
AND next_payment_date < '2025-09-29'::date;

-- Delete income with payment dates before 9/29/2025
DELETE FROM public.income
WHERE user_id = auth.uid()
AND payment_date < '2025-09-29'::date;

-- Delete bank transactions before 9/29/2025
DELETE FROM public.bank_transactions
WHERE user_id = auth.uid()
AND date < '2025-09-29'::date;

-- Delete cash flow events before 9/29/2025
DELETE FROM public.cash_flow_events
WHERE user_id = auth.uid()
AND event_date < '2025-09-29'::date;

-- Delete Amazon transactions before 9/29/2025
DELETE FROM public.amazon_transactions
WHERE user_id = auth.uid()
AND transaction_date < '2025-09-29'::timestamptz;

-- Delete Amazon payouts before 9/29/2025
DELETE FROM public.amazon_payouts
WHERE user_id = auth.uid()
AND payout_date < '2025-09-29'::date;