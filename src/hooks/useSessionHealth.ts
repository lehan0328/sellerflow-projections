import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SessionHealthStatus {
  isHealthy: boolean;
  issues: string[];
  accountId: string | null;
  userId: string | null;
  lastCheck: Date | null;
}

export const useSessionHealth = () => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<SessionHealthStatus>({
    isHealthy: true,
    issues: [],
    accountId: null,
    userId: null,
    lastCheck: null,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkSessionHealth = async () => {
    if (!user?.id) {
      setHealthStatus({
        isHealthy: false,
        issues: ["No authenticated user"],
        accountId: null,
        userId: null,
        lastCheck: new Date(),
      });
      return;
    }

    setIsChecking(true);
    console.log('[SessionHealth] Starting health check...');

    try {
      // Check 1: Verify session exists
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[SessionHealth] Session error:', sessionError);
        setHealthStatus({
          isHealthy: false,
          issues: ["Invalid or expired session"],
          accountId: null,
          userId: user.id,
          lastCheck: new Date(),
        });
        toast.error("Session expired. Please log in again.");
        return;
      }

      // Check 2: Verify profile exists and has account_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id, user_id, email')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('[SessionHealth] Profile error:', profileError);
        setHealthStatus({
          isHealthy: false,
          issues: ["Profile not found or inaccessible"],
          accountId: null,
          userId: user.id,
          lastCheck: new Date(),
        });
        toast.error("Profile data not found. Please contact support.");
        return;
      }

      if (!profile.account_id) {
        console.error('[SessionHealth] Profile missing account_id');
        setHealthStatus({
          isHealthy: false,
          issues: ["Profile missing account_id"],
          accountId: null,
          userId: user.id,
          lastCheck: new Date(),
        });
        toast.error("Account configuration error. Please contact support.");
        return;
      }

      // Check 3: Verify data visibility by attempting to query a simple table
      const { data: testQuery, error: testError } = await supabase
        .from('categories')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('[SessionHealth] Data visibility test failed:', testError);
        setHealthStatus({
          isHealthy: false,
          issues: ["Cannot access user data - possible RLS issue"],
          accountId: profile.account_id,
          userId: user.id,
          lastCheck: new Date(),
        });
        toast.error("Data access issue detected. Attempting to refresh...");
        
        // Attempt session refresh
        await supabase.auth.refreshSession();
        return;
      }

      // All checks passed
      console.log('[SessionHealth] Health check passed:', {
        userId: user.id,
        accountId: profile.account_id,
        email: profile.email
      });

      setHealthStatus({
        isHealthy: true,
        issues: [],
        accountId: profile.account_id,
        userId: user.id,
        lastCheck: new Date(),
      });
    } catch (error) {
      console.error('[SessionHealth] Unexpected error during health check:', error);
      setHealthStatus({
        isHealthy: false,
        issues: ["Unexpected error during health check"],
        accountId: null,
        userId: user.id,
        lastCheck: new Date(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Run health check on mount and when user changes
  useEffect(() => {
    checkSessionHealth();
    
    // Set up periodic health checks (every 5 minutes)
    const interval = setInterval(checkSessionHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const forceRefresh = async () => {
    console.log('[SessionHealth] Forcing session refresh...');
    toast.info("Refreshing session...");
    
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      await checkSessionHealth();
      toast.success("Session refreshed successfully");
    } catch (error) {
      console.error('[SessionHealth] Failed to refresh session:', error);
      toast.error("Failed to refresh session. Please try logging out and back in.");
    }
  };

  return {
    ...healthStatus,
    isChecking,
    checkHealth: checkSessionHealth,
    forceRefresh,
  };
};
