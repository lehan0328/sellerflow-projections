-- Populate missing user_email and user_name in forecast_accuracy_log
UPDATE forecast_accuracy_log fal
SET 
  user_email = au.email,
  user_name = COALESCE(p.first_name || ' ' || p.last_name, au.email)
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE fal.user_id = au.id
  AND (fal.user_email IS NULL OR fal.user_name IS NULL);

-- Ensure admin can read all forecast accuracy logs
DROP POLICY IF EXISTS "Website admin can view all forecast accuracy logs" ON forecast_accuracy_log;

CREATE POLICY "Website admin can view all forecast accuracy logs"
  ON forecast_accuracy_log
  FOR SELECT
  TO authenticated
  USING (
    is_website_admin()
  );