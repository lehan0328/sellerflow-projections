-- Drop the old function
DROP FUNCTION IF EXISTS public.get_amazon_revenue_30_days(uuid);

-- Create updated function to get Amazon revenue from daily rollups (actual report data)
CREATE OR REPLACE FUNCTION public.get_amazon_revenue_30_days(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(total_revenue), 0)
  FROM amazon_daily_rollups
  WHERE user_id = p_user_id
    AND rollup_date >= CURRENT_DATE - INTERVAL '30 days'
    AND rollup_date <= CURRENT_DATE;
$function$;