-- Drop old function
DROP FUNCTION IF EXISTS get_amazon_revenue_30_days(UUID);

-- Create updated function to calculate Amazon gross revenue for last 30 days
-- Uses amazon_payouts table which has actual settlement data
CREATE OR REPLACE FUNCTION get_amazon_revenue_30_days(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(orders_total), 0)
  FROM amazon_payouts
  WHERE user_id = p_user_id
    AND status = 'confirmed'
    AND payout_date >= CURRENT_DATE - INTERVAL '30 days'
    AND payout_date <= CURRENT_DATE;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;