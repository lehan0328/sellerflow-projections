import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Add timeout to prevent hanging
    const checkSession = async () => {
      try {
        // Set a timeout promise
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('Auth check timed out after 10 seconds');
            resolve(null);
          }, 10000); // 10 second timeout
        });

        // Race between session check and timeout
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeoutPromise]);

        clearTimeout(timeoutId);

        if (mounted && result) {
          const { data: { session }, error } = result;
          
          if (error) {
            console.error('Auth error:', error);
          }

          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        } else if (mounted) {
          // Timeout occurred, stop loading anyway
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
        }
      }
    };

    checkSession();

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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    return error;
  };

  return {
    ...authState,
    signOut,
  };
};