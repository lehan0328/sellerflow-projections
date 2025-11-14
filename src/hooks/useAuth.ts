import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    });

    // Set up auth state listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const validateSession = async () => {
    if (!authState.user?.id) return false;

    try {
      console.log('[useAuth] Validating session...');
      
      // Verify session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('[useAuth] Invalid session:', sessionError);
        return false;
      }

      // Verify profile exists and matches
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id, user_id')
        .eq('user_id', authState.user.id)
        .single();

      if (profileError || !profile) {
        console.error('[useAuth] Profile verification failed:', profileError);
        return false;
      }

      if (!profile.account_id) {
        console.error('[useAuth] Profile missing account_id');
        return false;
      }

      console.log('[useAuth] Session validated successfully:', {
        userId: authState.user.id,
        accountId: profile.account_id
      });

      return true;
    } catch (error) {
      console.error('[useAuth] Session validation error:', error);
      return false;
    }
  };

  const signOut = async () => {
    console.log('[useAuth] Signing out...');
    
    // Clear all cached queries to prevent stale data on next login
    queryClient.clear();
    
    // Clear local/session storage
    localStorage.clear();
    sessionStorage.clear();
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    return error;
  };

  return {
    ...authState,
    signOut,
    validateSession,
  };
};