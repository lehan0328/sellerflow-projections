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

      // Clear subscription cache to ensure fresh check
      try {
        localStorage.removeItem('auren_subscription_cache');
        sessionStorage.removeItem(`trial_status_${user.id}`);
      } catch (e) {
        console.error('Failed to clear cache:', e);
      }

      // Get user's profile to check if they're part of a team
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_end, account_id, is_account_owner')
        .eq('user_id', user.id)
        .maybeSingle();

      let trialEndDate = profile?.trial_end || null;

      // If user is part of a team (not account owner), check account owner's trial
      if (profile?.account_id && !profile?.is_account_owner) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('trial_end')
          .eq('account_id', profile.account_id)
          .eq('is_account_owner', true)
          .maybeSingle();

        // Use account owner's trial status for team members
        if (ownerProfile) {
          trialEndDate = ownerProfile.trial_end;
        }
      }

      setTrialEnd(trialEndDate);
      setCheckingTrial(false);
    };

    fetchTrialStatus();
  }, [user]);

  // Check if trial has expired or user has no plan
  const isTrialExpired = !subscribed && (!trialEnd || new Date(trialEnd) < new Date());

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