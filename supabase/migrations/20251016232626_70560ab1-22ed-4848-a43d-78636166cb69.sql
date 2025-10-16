-- Update plan_limits table with Amazon connection limits
UPDATE plan_limits SET amazon_connections = 1 WHERE plan_name = 'starter';
UPDATE plan_limits SET amazon_connections = 1 WHERE plan_name = 'growing';
UPDATE plan_limits SET amazon_connections = 1 WHERE plan_name = 'professional';
UPDATE plan_limits SET amazon_connections = 2 WHERE plan_name = 'enterprise';