-- Update max_team_members for professional plan users
UPDATE profiles 
SET max_team_members = 5 
WHERE plan_override = 'professional' AND max_team_members < 5;