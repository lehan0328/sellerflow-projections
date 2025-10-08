-- Simulate purchase of 5 additional user addons
UPDATE profiles 
SET max_team_members = 11
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';

-- This simulates what happens when add-subscription-items edge function processes 5 user addon purchases