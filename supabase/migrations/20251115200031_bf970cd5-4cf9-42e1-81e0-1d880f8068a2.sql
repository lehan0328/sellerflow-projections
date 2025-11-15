-- Update Enterprise plan to allow only 1 Amazon connection (same as other tiers)
UPDATE plan_limits 
SET amazon_connections = 1 
WHERE plan_name = 'enterprise';