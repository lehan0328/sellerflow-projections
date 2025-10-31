-- Drop the incomplete function
DROP FUNCTION IF EXISTS public.get_amazon_revenue_30_days(uuid);

-- Create correct function to get Amazon revenue from transactions for last 30 days
CREATE OR REPLACE FUNCTION public.get_amazon_revenue_30_days(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount), 0)
  FROM amazon_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'Order'
    AND amount > 0
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    AND transaction_date <= CURRENT_DATE;
$function$;