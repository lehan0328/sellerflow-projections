import { Shield, AlertTriangle, CheckCircle, RefreshCw, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSessionHealth } from "@/hooks/useSessionHealth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const AccountStatusWidget = () => {
  const { user } = useAuth();
  const { isHealthy, issues, accountId, isChecking, forceRefresh } = useSessionHealth();

  // Get data counts for verification
  const { data: dataCounts } = useQuery({
    queryKey: ['data-counts', user?.id],
    queryFn: async () => {
      const [
        { count: recurringCount },
        { count: transactionCount },
        { count: vendorCount },
        { count: bankAccountCount }
      ] = await Promise.all([
        supabase.from('recurring_expenses').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
        supabase.from('bank_accounts').select('*', { count: 'exact', head: true })
      ]);

      return {
        recurring: recurringCount || 0,
        transactions: transactionCount || 0,
        vendors: vendorCount || 0,
        bankAccounts: bankAccountCount || 0
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  if (!user) return null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${isHealthy ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              {isHealthy ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Session Status</span>
                <Badge variant={isHealthy ? "default" : "destructive"} className="text-xs">
                  {isHealthy ? "Healthy" : "Issue Detected"}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  <span className="font-mono">{accountId || "No Account ID"}</span>
                </div>
                
                {dataCounts && (
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3" />
                    <span>
                      {dataCounts.recurring} recurring · {dataCounts.transactions} transactions · {dataCounts.vendors} vendors · {dataCounts.bankAccounts} accounts
                    </span>
                  </div>
                )}
              </div>

              {issues.length > 0 && (
                <div className="text-xs text-destructive space-y-1">
                  {issues.map((issue, idx) => (
                    <div key={idx}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={forceRefresh}
            disabled={isChecking}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
