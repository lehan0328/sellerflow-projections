-- Update plan_limits table to add team_members column
ALTER TABLE plan_limits 
ADD COLUMN IF NOT EXISTS team_members INTEGER NOT NULL DEFAULT 0;

-- Update existing plan limits with team member counts
UPDATE plan_limits SET team_members = 0 WHERE plan_name = 'starter';
UPDATE plan_limits SET team_members = 2 WHERE plan_name = 'growing';
UPDATE plan_limits SET team_members = 5 WHERE plan_name = 'professional';
UPDATE plan_limits SET team_members = 7 WHERE plan_name = 'enterprise';