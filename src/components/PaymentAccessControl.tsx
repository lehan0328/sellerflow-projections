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
  const { isAdmin } = useAdmin();
  const [isChecking, setIsChecking] = useState(true);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAccountStatus();
  }, [location.pathname]);

  const checkAccountStatus = async () => {
    try {
      // Skip check for auth and payment pages
      if (location.pathname === '/auth' || location.pathname === '/payment-required') {
        setIsChecking(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsChecking(false);
        return;
      }

      // Get user's profile to check account status
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      setAccountStatus(profile?.account_status || 'active');

      // If account is suspended and user is not admin, redirect to payment page
      if (profile?.account_status === 'suspended_payment' && !isAdmin) {
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
