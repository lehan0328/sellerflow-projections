import { createContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<any>;
  validateSession: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
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

    // THEN check for existing session (single call for entire app)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const validateSession = async () => {
    if (!authState.user?.id) return false;

    try {
      console.log('[AuthContext] Validating session...');
      
      // Verify session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('[AuthContext] Invalid session:', sessionError);
        return false;
      }

      // Verify profile exists and matches
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id, user_id')
        .eq('user_id', authState.user.id)
        .single();

      if (profileError || !profile) {
        console.error('[AuthContext] Profile verification failed:', profileError);
        return false;
      }

      if (!profile.account_id) {
        console.error('[AuthContext] Profile missing account_id');
        return false;
      }

      console.log('[AuthContext] Session validated successfully:', {
        userId: authState.user.id,
        accountId: profile.account_id
      });

      return true;
    } catch (error) {
      console.error('[AuthContext] Session validation error:', error);
      return false;
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    
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

  return (
    <AuthContext.Provider value={{
      ...authState,
      signOut,
      validateSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
