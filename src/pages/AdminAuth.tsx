import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const AdminAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
          .from('admin_permissions')
          .select('role')
          .eq('email', session.user.email)
          .maybeSingle();

        if (adminPerms) {
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
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!data.session?.user) {
        toast({
          title: "Login Failed",
          description: "No session created",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Now check if user has admin access through any method
      // 1. Check if website admin (hardcoded emails)
      const { data: isWebsiteAdmin } = await supabase
        .rpc('is_website_admin');

      if (isWebsiteAdmin) {
        toast({
          title: "Welcome back!",
          description: "Logged in as Website Admin",
        });
        navigate('/admin/dashboard');
        return;
      }

      // 2. Check admin_permissions table
      const { data: adminPerms } = await supabase
        .from('admin_permissions')
        .select('role')
        .eq('email', data.session.user.email)
        .maybeSingle();

      if (adminPerms) {
        toast({
          title: "Welcome back!",
          description: `Logged in as ${adminPerms.role}`,
        });
        navigate('/admin/dashboard');
        return;
      }

      // 3. Check user_roles table for admin or staff role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.session.user.id)
        .in('role', ['admin', 'staff'])
        .maybeSingle();

      if (userRole) {
        toast({
          title: "Welcome back!",
          description: `Logged in as ${userRole.role}`,
        });
        navigate('/admin/dashboard');
        return;
      }

      // No admin access found - sign them out
      await supabase.auth.signOut();
      toast({
        title: "Access Denied",
        description: "This account does not have admin dashboard access.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
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
