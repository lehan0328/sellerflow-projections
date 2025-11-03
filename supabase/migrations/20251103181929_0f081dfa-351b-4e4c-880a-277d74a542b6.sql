-- Simplify RLS policies for forecast_accuracy_log to ensure admin access
DROP POLICY IF EXISTS "Admins can view all forecast accuracy logs" ON forecast_accuracy_log;
DROP POLICY IF EXISTS "Website admin can view all forecast accuracy logs" ON forecast_accuracy_log;
DROP POLICY IF EXISTS "Users can view their own forecast accuracy logs" ON forecast_accuracy_log;

-- Create a single comprehensive admin policy
CREATE POLICY "Admins and website admin can view all logs"
  ON forecast_accuracy_log
  FOR SELECT
  TO authenticated
  USING (
    is_website_admin() OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Users can still view their own logs
CREATE POLICY "Users can view their own logs"
  ON forecast_accuracy_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);