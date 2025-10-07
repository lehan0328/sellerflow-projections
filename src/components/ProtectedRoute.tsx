import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { LoadingScreen } from './LoadingScreen';
import { TrialExpiredModal } from './TrialExpiredModal';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { subscribed, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [checkingTrial, setCheckingTrial] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!user) {
        setCheckingTrial(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_end')
        .eq('user_id', user.id)
        .single();

      setTrialEnd(profile?.trial_end || null);
      setCheckingTrial(false);
    };

    fetchTrialStatus();
  }, [user]);

  // DEMO: Force show trial expired for demonstration
  const isDemoAccount = user?.email === 'chuandy914@gmail.com';
  
  // Check if trial has expired
  const isTrialExpired = isDemoAccount || (!subscribed && trialEnd && new Date(trialEnd) < new Date());

  if (loading || subLoading || checkingTrial) {
    return <LoadingScreen message="Verifying your session..." />;
  }

  if (!user) {
    return null;
  }

  // Show trial expired modal and block access
  if (isTrialExpired) {
    return <TrialExpiredModal open={true} />;
  }

  return <>{children}</>;
};