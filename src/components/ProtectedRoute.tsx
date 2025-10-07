import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { LoadingScreen } from './LoadingScreen';
import { TrialExpiredModal } from './TrialExpiredModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { subscribed, is_trialing, trial_end, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Check if trial has expired
  const isTrialExpired = !subscribed && !is_trialing && trial_end && new Date(trial_end) < new Date();

  if (loading || subLoading) {
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