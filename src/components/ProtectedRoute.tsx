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

      // Check cache first
      const cacheKey = `trial_status_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { trialEnd: cachedTrialEnd, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          // Use cache if less than 5 minutes old
          if (age < 5 * 60 * 1000) {
            setTrialEnd(cachedTrialEnd);
            setCheckingTrial(false);
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_end')
        .eq('user_id', user.id)
        .maybeSingle();

      const trialEndDate = profile?.trial_end || null;
      setTrialEnd(trialEndDate);
      setCheckingTrial(false);
      
      // Cache the result
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          trialEnd: trialEndDate,
          timestamp: Date.now()
        }));
      } catch {
        // Ignore cache errors
      }
    };

    fetchTrialStatus();
  }, [user]);

  // Check if trial has expired
  const isTrialExpired = !subscribed && trialEnd && new Date(trialEnd) < new Date();

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