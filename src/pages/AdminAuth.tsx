import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AdminAuth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if already authenticated as admin
    const checkAdminAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check all admin access methods
        const { data: isWebsiteAdmin } = await supabase.rpc('is_website_admin');
        
        if (isWebsiteAdmin) {
          navigate('/admin/dashboard');
          return;
        }

        const { data: adminPerms } = await supabase
          .rpc('check_admin_permission', { user_email: session.user.email });

        if (adminPerms && adminPerms.length > 0 && adminPerms[0].has_permission) {
          navigate('/admin/dashboard');
          return;
        }

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .in('role', ['admin', 'staff'])
          .maybeSingle();

        if (userRole) {
          navigate('/admin/dashboard');
          return;
        }
      }
      setCheckingAuth(false);
    };

    checkAdminAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First attempt to authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMsg = error.message.toLowerCase().includes('invalid')
          ? "Invalid email or password. Please check your credentials and try again."
          : error.message;
        
        toast.error(errorMsg, {
          description: "Unable to sign in to admin dashboard",
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      if (!data.session?.user) {
        toast.error("Unable to create session", {
          description: "Please try again or contact support",
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      // Now check if user has admin access through any method
      
      // 1. Check if website admin (hardcoded emails)
      const { data: isWebsiteAdmin, error: rpcError } = await supabase
        .rpc('is_website_admin');

      if (isWebsiteAdmin) {
        toast.success("Welcome back!", {
          description: "Logged in as Website Admin",
        });
        navigate('/admin/dashboard');
        return;
      }

      // 2. Check admin_permissions table using security definer function
      const { data: adminPerms, error: permsError } = await supabase
        .rpc('check_admin_permission', { user_email: data.session.user.email });

      if (adminPerms && adminPerms.length > 0 && adminPerms[0].has_permission) {
        toast.success("Welcome back!", {
          description: `Logged in as ${adminPerms[0].role}`,
        });
        navigate('/admin/dashboard');
        return;
      }

      // 3. Check user_roles table for admin or staff role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.session.user.id)
        .in('role', ['admin', 'staff'])
        .maybeSingle();

      if (userRole) {
        toast.success("Welcome back!", {
          description: `Logged in as ${userRole.role}`,
        });
        navigate('/admin/dashboard');
        return;
      }

      // No admin access found - sign them out
      console.warn('[ADMIN_LOGIN] User authenticated but no admin access found:', data.session.user.email);
      await supabase.auth.signOut();
      toast.error("Access Denied", {
        description: "This account does not have admin dashboard access.",
        duration: 6000,
      });
    } catch (error: any) {
      console.error('[ADMIN_LOGIN] Unexpected error:', error);
      toast.error("Login Error", {
        description: error.message || "An unexpected error occurred. Please try again.",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Admin Dashboard</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;
