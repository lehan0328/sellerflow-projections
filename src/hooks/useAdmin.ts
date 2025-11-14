import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Website admin emails - only these users can access the admin dashboard
const WEBSITE_ADMIN_EMAILS = ['chuandy914@gmail.com', 'orders@imarand.com'];

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
      let isWebsiteAdmin = WEBSITE_ADMIN_EMAILS.includes(session.user.email || '');
      let adminRole: 'owner' | 'admin' | 'staff' | null = null;

      // If not a hardcoded website admin, check admin_permissions using RPC function
      if (!isWebsiteAdmin) {
        const { data: adminPermission } = await supabase
          .rpc('check_admin_permission', { user_email: session.user.email || '' });

        if (adminPermission && adminPermission.length > 0 && adminPermission[0].has_permission) {
          isWebsiteAdmin = true;
          adminRole = adminPermission[0].role as 'admin' | 'staff';
        }
      } else {
        adminRole = 'admin'; // Hardcoded admins are full admins
      }

      setIsAdmin(isWebsiteAdmin);
      
      // If user has admin dashboard permissions, set their role
      if (adminRole) {
        setUserRole(adminRole);
        setIsAccountAdmin(adminRole === 'admin');
      } else {
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
