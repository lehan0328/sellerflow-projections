-- Remove plan override to properly test trial expiration
UPDATE profiles 
SET plan_override = NULL
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';