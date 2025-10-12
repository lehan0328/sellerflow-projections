import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'staff' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAdmin(false);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Check user's role in user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      const role = data?.role as 'owner' | 'admin' | 'staff' | null;
      setUserRole(role);
      // Owner and Admin can access company settings
      setIsAdmin(role === 'owner' || role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, userRole, isLoading, checkAdminStatus };
};
