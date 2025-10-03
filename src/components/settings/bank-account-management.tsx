import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, RefreshCw, ExternalLink, DollarSign, TrendingUp, Database } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";

export function BankAccountManagement() {
  const { accounts, isLoading, totalBalance, removeAccount } = useBankAccounts();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Plaid Link configuration with OAuth support
  const config = {
    token: linkToken,
    receivedRedirectUri: window.location.href,
    onSuccess: async (public_token: string, metadata: any) => {
      try {
        console.log("Plaid Link success:", metadata);
        
        // Clear OAuth state from sessionStorage
        sessionStorage.removeItem('plaid_oauth_state_id');
        
        // Exchange the public token for an access token via edge function
        const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
          body: { publicToken: public_token, metadata }
        });

        if (error) throw error;

        toast.success(data.message || "Account connected successfully!");
        setIsConnecting(false);
        setLinkToken(null);
      } catch (error) {
        console.error("Error exchanging token:", error);
        toast.error("Failed to connect account");
        setIsConnecting(false);
      }
    },
    onExit: (err: any, metadata: any) => {
      console.log("Plaid Link exit:", { err, metadata });
      if (err) {
        toast.error("Failed to connect account");
      }
      setIsConnecting(false);
      sessionStorage.removeItem('plaid_oauth_state_id');
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Open Plaid Link when token is available or when returning from OAuth
  useEffect(() => {
    if (linkToken && ready) {
      // Check if we're returning from OAuth
      const oauthStateId = sessionStorage.getItem('plaid_oauth_state_id');
      if (oauthStateId) {
        console.log('Resuming OAuth flow with state ID:', oauthStateId);
      }
      open();
    }
  }, [linkToken, ready, open]);

  const handleConnectAccount = async () => {
    try {
      setIsConnecting(true);
      
      // Get link token from edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to connect accounts");
        setIsConnecting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId: user.id }
      });

      if (error) throw error;

      setLinkToken(data.link_token);
    } catch (error) {
      console.error("Error creating link token:", error);
      toast.error("Failed to initialize account connection");
      setIsConnecting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSyncAccount = async (accountId: string) => {
    setIsSyncing(accountId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-plaid-accounts', {
        body: { accountId, accountType: 'bank_account' }
      });

      if (error) throw error;

      toast.success(data.message || "Account synced successfully");
    } catch (error) {
      console.error("Error syncing account:", error);
      toast.error("Failed to sync account");
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    const success = await removeAccount(accountId);
    if (!success) {
      console.error("Failed to remove account");
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "depository": return "default";
      case "credit": return "secondary";
      case "loan": return "destructive";
      case "investment": return "outline";
      default: return "default";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Bank Account Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Bank Account Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Connected Accounts</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{accounts.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Total Balance</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalBalance)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Last Sync</span>
                </div>
                <p className="text-sm text-purple-600 font-medium">
                  {accounts.length > 0 
                    ? new Date(Math.max(...accounts.map(a => new Date(a.last_sync).getTime()))).toLocaleDateString()
                    : "Never"
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Connect Account Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleConnectAccount}
              disabled={isConnecting}
              className="w-full max-w-xs"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Account"}
            </Button>
          </div>

          <div className="border-t pt-6">
            {/* Accounts List */}
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bank Accounts Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your bank accounts to track cash flow and automate reconciliation
                </p>
                <Button 
                  onClick={handleConnectAccount}
                  disabled={isConnecting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect Your First Account"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <Card key={account.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold">{account.account_name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {account.account_number}
                              </Badge>
                              <Badge variant={getAccountTypeColor(account.account_type)} className="text-xs">
                                {account.account_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{account.institution_name}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>Last sync: {new Date(account.last_sync).toLocaleDateString()}</span>
                              <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${account.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span>{account.is_active ? 'Connected' : 'Disconnected'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {formatCurrency(account.balance)}
                            </p>
                            {account.available_balance && (
                              <p className="text-sm text-muted-foreground">
                                Available: {formatCurrency(account.available_balance)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncAccount(account.id)}
                              disabled={isSyncing === account.id}
                            >
                              <RefreshCw className={`h-4 w-4 ${isSyncing === account.id ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAccount(account.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Plaid Info */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center space-x-2">
                <ExternalLink className="h-4 w-4" />
                <span>About Plaid Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Bank-level security with 256-bit encryption</p>
                <p>• Real-time balance and transaction data</p>
                <p>• Supports 11,000+ financial institutions</p>
                <p>• Read-only access - we cannot move money</p>
                <div className="flex items-center space-x-2 pt-2">
                  <ExternalLink className="h-4 w-4" />
                  <a 
                    href="https://plaid.com/security/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Learn more about Plaid security
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </>
  );
}