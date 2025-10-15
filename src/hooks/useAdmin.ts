import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Website admin email - only this user can access the admin dashboard
const WEBSITE_ADMIN_EMAIL = 'chuandy914@gmail.com';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAccountAdmin, setIsAccountAdmin] = useState(false);
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
        setIsAccountAdmin(false);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Check if user is the website admin (superuser)
      const isWebsiteAdmin = session.user.email === WEBSITE_ADMIN_EMAIL;
      setIsAdmin(isWebsiteAdmin);

      // Check user's company role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (!error && data) {
        const role = data.role as 'owner' | 'admin' | 'staff' | null;
        setUserRole(role);
        // Account admins are owners or admins
        setIsAccountAdmin(role === 'owner' || role === 'admin');
      } else {
        setUserRole(null);
        setIsAccountAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setIsAccountAdmin(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isAccountAdmin, userRole, isLoading, checkAdminStatus };
};
