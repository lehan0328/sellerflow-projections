-- Update bank_transactions cleanup from 45 to 60 days
CREATE OR REPLACE FUNCTION public.cleanup_old_bank_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago, not 45)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived bank transactions older than 60 days
  WITH deleted AS (
    DELETE FROM bank_transactions
    WHERE date < v_cutoff_date
    AND archived = true
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived bank transactions older than %', v_deleted_count, v_cutoff_date;
END;
$$;

-- Create cleanup function for transactions table (purchase orders & expenses)
CREATE OR REPLACE FUNCTION public.cleanup_old_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived transactions older than 60 days
  WITH deleted AS (
    DELETE FROM transactions
    WHERE (due_date < v_cutoff_date OR transaction_date < v_cutoff_date)
    AND archived = true
    AND status = 'completed'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived transactions older than %', v_deleted_count, v_cutoff_date;
END;
$$;

-- Create cleanup function for income table
CREATE OR REPLACE FUNCTION public.cleanup_old_income()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived income records older than 60 days
  WITH deleted AS (
    DELETE FROM income
    WHERE payment_date < v_cutoff_date
    AND archived = true
    AND status = 'received'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived income records older than %', v_deleted_count, v_cutoff_date;
END;
$$;

-- Schedule daily cleanup for transactions table
SELECT cron.schedule(
  'daily-transactions-cleanup',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT public.cleanup_old_transactions();
  $$
);

-- Schedule daily cleanup for income table
SELECT cron.schedule(
  'daily-income-cleanup',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT public.cleanup_old_income();
  $$
);