import { useState } from "react";
import { AlertTriangle, HelpCircle, RefreshCw, LogOut, Database, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useSessionHealth } from "@/hooks/useSessionHealth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export const DataTroubleshootingPanel = () => {
  const { user, signOut } = useAuth();
  const { isHealthy, forceRefresh, accountId, checkHealth } = useSessionHealth();
  const [isFixing, setIsFixing] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const troubleshootingSteps = [
    {
      id: "refresh-session",
      title: "Refresh Your Session",
      description: "This will reload your authentication and data permissions",
      action: async () => {
        await forceRefresh();
        await queryClient.invalidateQueries();
        toast.success("Session refreshed");
      }
    },
    {
      id: "clear-cache",
      title: "Clear Local Cache",
      description: "This will clear all cached data and force fresh data load",
      action: async () => {
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
        toast.success("Cache cleared");
        window.location.reload();
      }
    },
    {
      id: "verify-data",
      title: "Verify Data Access",
      description: "Check if you can access your account data",
      action: async () => {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_id, user_id')
          .eq('user_id', user?.id)
          .single();

        if (profileError || !profile) {
          toast.error("Cannot access profile data");
          return;
        }

        const { count, error: dataError } = await supabase
          .from('recurring_expenses')
          .select('*', { count: 'exact', head: true });

        if (dataError) {
          toast.error("Cannot access recurring expenses data");
          return;
        }

        toast.success(`Data access verified. Found ${count || 0} recurring expenses.`);
      }
    },
    {
      id: "force-logout",
      title: "Force Logout & Login",
      description: "Sign out completely and log back in to reset everything",
      action: async () => {
        await signOut();
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
        toast.info("Signed out. Please log back in.");
        navigate('/auth');
      }
    }
  ];

  const runAutoFix = async () => {
    setIsFixing(true);
    toast.info("Running automatic fixes...");

    try {
      // Step 1: Refresh session
      await forceRefresh();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Check health
      await checkHealth();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Invalidate all queries
      await queryClient.invalidateQueries();
      
      toast.success("Auto-fix completed. Check if your data is now visible.");
    } catch (error) {
      console.error('[DataTroubleshooting] Auto-fix failed:', error);
      toast.error("Auto-fix failed. Try manual steps below.");
    } finally {
      setIsFixing(false);
    }
  };

  if (isHealthy) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-sm">
          Your session is healthy and data access is working correctly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">Data Not Showing?</CardTitle>
        </div>
        <CardDescription>
          We detected an issue with your session or data access. Try these troubleshooting steps:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Account ID:</strong> {accountId || "Not found"}<br />
            <strong>User ID:</strong> {user?.id || "Not found"}
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runAutoFix} 
          disabled={isFixing}
          className="w-full"
          variant="default"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
          {isFixing ? "Running Fixes..." : "Run Automatic Fix"}
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium">Manual Troubleshooting:</p>
          {troubleshootingSteps.map((step) => (
            <div key={step.id} className="flex items-start gap-3 p-3 border rounded-lg bg-background">
              <div className="flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={step.action}
                disabled={isFixing}
              >
                Try
              </Button>
            </div>
          ))}
        </div>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription className="text-xs">
            If these steps don't resolve the issue, please contact support at{" "}
            <a href="mailto:support@auren.app" className="underline">support@auren.app</a>
            {" "}with your Account ID: <code className="font-mono">{accountId || "unknown"}</code>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
