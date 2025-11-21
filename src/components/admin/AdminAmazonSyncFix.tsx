import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, RotateCcw, Play } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminAmazonSyncFix() {
  const [accountId, setAccountId] = useState("40524d5a-0ede-439e-a56f-d4ef18d1ec5c");
  const [userId, setUserId] = useState("86474603-971a-4f99-8ed1-cb210994c7b0");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [results, setResults] = useState<string[]>([]);

  const executeFix = async () => {
    setLoading(true);
    setStep(0);
    setResults([]);

    try {
      // Step 1: Reset sync status
      setStep(1);
      setResults(prev => [...prev, "Step 1: Resetting sync status..."]);
      
      const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-amazon-sync', {
        body: { accountId }
      });

      if (resetError) throw new Error(`Reset failed: ${resetError.message}`);
      setResults(prev => [...prev, `✓ Reset complete: ${resetData.message}`]);

      // Step 2: Refresh access token
      setStep(2);
      setResults(prev => [...prev, "Step 2: Refreshing access token..."]);
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { amazon_account_id: accountId }
      });

      if (tokenError) throw new Error(`Token refresh failed: ${tokenError.message}`);
      setResults(prev => [...prev, `✓ Token refreshed, expires: ${new Date(tokenData.expires_at).toLocaleString()}`]);

      // Step 3: Trigger sync
      setStep(3);
      setResults(prev => [...prev, "Step 3: Triggering Amazon sync..."]);
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('trigger-amazon-sync', {
        body: { amazonAccountId: accountId, userId }
      });

      if (syncError) throw new Error(`Sync trigger failed: ${syncError.message}`);
      setResults(prev => [...prev, `✓ Sync triggered successfully: ${syncData.message}`]);

      setStep(4);
      toast.success("3-step fix completed successfully!");
      
    } catch (error: any) {
      console.error('Fix error:', error);
      setResults(prev => [...prev, `✗ Error at step ${step}: ${error.message}`]);
      toast.error(`Fix failed at step ${step}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amazon Sync Fix Tool</CardTitle>
        <CardDescription>
          3-step recovery process for stuck Amazon syncs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountId">Amazon Account ID</Label>
          <Input
            id="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter Amazon account ID"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            disabled={loading}
          />
        </div>

        <Button 
          onClick={executeFix} 
          disabled={loading || !accountId || !userId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executing Step {step}/3...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Execute 3-Step Fix
            </>
          )}
        </Button>

        {results.length > 0 && (
          <Alert>
            <AlertDescription>
              <div className="space-y-1 font-mono text-xs">
                {results.map((result, index) => (
                  <div key={index} className={
                    result.startsWith('✓') ? 'text-green-600' :
                    result.startsWith('✗') ? 'text-red-600' :
                    'text-muted-foreground'
                  }>
                    {result}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold">Fix Process:</p>
          <div className="space-y-1 pl-4">
            <div className="flex items-start gap-2">
              <RotateCcw className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Step 1:</strong> Reset sync status to idle, clear progress</span>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Step 2:</strong> Refresh expired access token</span>
            </div>
            <div className="flex items-start gap-2">
              <Play className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Step 3:</strong> Trigger full Amazon data sync</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
