-- Demo: Simulate user addon purchase by incrementing max_team_members
UPDATE profiles 
SET max_team_members = 6
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';

-- Add comment showing what happens
COMMENT ON COLUMN profiles.max_team_members IS 'Maximum number of team members allowed. Incremented when user addon is purchased via Stripe.';