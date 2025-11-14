import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { LoadingScreen } from "./LoadingScreen";

interface PaymentAccessControlProps {
  children: React.ReactNode;
}

export const PaymentAccessControl = ({ children }: PaymentAccessControlProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [isChecking, setIsChecking] = useState(true);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);

  useEffect(() => {
    // List of public routes that don't need account status check
    const publicRoutes = [
      '/',
      '/auth',
      '/signup',
      '/payment-required',
      '/pricing',
      '/features',
      '/contact',
      '/docs',
      '/privacy',
      '/terms',
      '/blog',
      '/partners',
      '/oauth-redirect',
      '/amazon-oauth-callback',
      '/admin' // Admin routes don't need subscription checks
    ];
    
    // Skip check for public routes (including dynamic routes like /blog/*, /features/*, /docs/*)
    const isPublicRoute = publicRoutes.some(route => 
      location.pathname === route || 
      location.pathname.startsWith(`${route}/`)
    );
    
    if (isPublicRoute) {
      setIsChecking(false);
      return;
    }
    
    // Wait for admin check to complete before checking account status
    if (!adminLoading) {
      checkAccountStatus();
    }
  }, [location.pathname, adminLoading]);

  const checkAccountStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsChecking(false);
        return;
      }

      // Get user's profile to check if they're part of a team
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_status, account_id, is_account_owner, plan_override')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setIsChecking(false);
        return;
      }

      if (!profile) {
        console.warn('No profile found for user');
        setIsChecking(false);
        return;
      }

      let accountStatus = profile.account_status || 'active';
      let planOverride = profile.plan_override;

      // If user is part of a team (not account owner), check account owner's status
      if (profile.account_id && !profile.is_account_owner) {
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('profiles')
          .select('account_status, plan_override')
          .eq('account_id', profile.account_id)
          .eq('is_account_owner', true)
          .maybeSingle();

        if (ownerError) {
          console.error('Error fetching owner profile:', ownerError);
        } else if (ownerProfile) {
          accountStatus = ownerProfile.account_status;
          planOverride = ownerProfile.plan_override;
        }
      }

      setAccountStatus(accountStatus);

      // If user has a plan override (lifetime access, tier1, etc.), bypass payment checks
      if (planOverride) {
        setIsChecking(false);
        return;
      }

      // If account is suspended for payment failure and user is not admin, redirect to payment page
      // If account is trial_expired, let ProtectedRoute handle it with TrialExpiredModal
      if (accountStatus === 'suspended_payment' && !isAdmin) {
        navigate('/payment-required');
        return;
      }

      setIsChecking(false);
    } catch (error) {
      console.error('Error checking account status:', error);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return <LoadingScreen message="Checking account status..." />;
  }

  return <>{children}</>;
};
