-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'low_balance', 'payment_due', 'income_received', 'daily_summary', 'weekly_summary'
  enabled BOOLEAN NOT NULL DEFAULT true,
  schedule_time TIME NOT NULL DEFAULT '09:00:00', -- Time of day to send
  schedule_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Days of week (1=Monday, 7=Sunday), null for daily types
  threshold_amount NUMERIC, -- For balance/spending thresholds
  advance_days INTEGER DEFAULT 3, -- Days in advance for payment reminders
  notification_channels TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'sms'
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create notification history table
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  amount NUMERIC,
  due_date DATE,
  read BOOLEAN DEFAULT false,
  actionable BOOLEAN DEFAULT false,
  action_label TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON public.notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_history
CREATE POLICY "Users can view their own notification history"
  ON public.notification_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification history"
  ON public.notification_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification history"
  ON public.notification_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Insert default notification preferences for existing users
INSERT INTO public.notification_preferences (user_id, notification_type, enabled, schedule_time, schedule_days)
SELECT 
  id,
  'daily_summary',
  true,
  '09:00:00',
  ARRAY[1,2,3,4,5]
FROM auth.users
ON CONFLICT DO NOTHING;