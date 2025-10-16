-- Create feature_requests table
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL CHECK (category IN ('feature', 'improvement', 'bug', 'integration')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own feature requests
CREATE POLICY "Users can view their own feature requests"
  ON public.feature_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create feature requests
CREATE POLICY "Users can create feature requests"
  ON public.feature_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all feature requests
CREATE POLICY "Admins can view all feature requests"
  ON public.feature_requests
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Admins can update all feature requests
CREATE POLICY "Admins can update all feature requests"
  ON public.feature_requests
  FOR UPDATE
  USING (has_admin_role(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();