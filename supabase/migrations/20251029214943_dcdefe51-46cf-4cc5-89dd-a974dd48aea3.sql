-- Create function to calculate Amazon revenue for last 30 days
CREATE OR REPLACE FUNCTION get_amazon_revenue_30_days(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM amazon_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'Order'
    AND amount > 0
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;