import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ArrowLeft, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { EnterpriseSetupModal } from "@/components/EnterpriseSetupModal";

export default function ManageAccounts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts, isLoading, totalBalance, addAccount, removeAccount, syncAccount } = useBankAccounts();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showEnterpriseSetup, setShowEnterpriseSetup] = useState(false);

  // Check for enterprise parameter from checkout
  useEffect(() => {
    const isEnterprise = searchParams.get('enterprise') === 'true';
    if (isEnterprise) {
      setShowEnterpriseSetup(true);
      // Remove the enterprise parameter from URL
      searchParams.delete('enterprise');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Plaid Link configuration - In production, get token from your backend
  const config = {
    token: null, // You'll need to implement a backend endpoint to get this
    onSuccess: async (public_token: string, metadata: any) => {
      try {
        // In a real app, exchange public_token for access_token on your backend
        // For demo purposes, we'll create a mock account
        const newAccount = {
          account_id: metadata.accounts[0]?.id || Date.now().toString(),
          access_token: "demo_access_token", // In real app, get from backend
          institution_name: metadata.institution.name,
          account_name: metadata.accounts[0]?.name || `${metadata.institution.name} Account`,
          account_number: `****${Math.random().toString().slice(-4)}`,
          account_type: metadata.accounts[0]?.type || "depository" as const,
          balance: Math.random() * 10000,
          available_balance: Math.random() * 8000,
          currency_code: "USD",
          last_sync: new Date().toISOString(),
          is_active: true,
          plaid_item_id: metadata.link_session_id,
        };

        const success = await addAccount(newAccount);
        if (success) {
          toast.success("Bank account connected successfully!");
        }
      } catch (error) {
        console.error("Error connecting account:", error);
        toast.error("Failed to connect bank account");
      }
    },
    onExit: (err: any, metadata: any) => {
      console.log("Plaid Link exit:", { err, metadata });
      if (err) {
        toast.error("Failed to connect bank account");
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSyncAccount = async (accountId: string) => {
    setIsSyncing(accountId);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = await syncAccount(accountId);
      if (success) {
        toast.success("Account synced successfully!");
      }
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading accounts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manage Bank Accounts</h1>
              <p className="text-muted-foreground">Connect and manage your bank accounts with Plaid</p>
            </div>
          </div>
          <Button
            onClick={() => {
              // For demo purposes, show message about Plaid setup
              toast.info("Plaid integration requires backend setup. Contact support for configuration.");
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Account
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Connected Accounts</p>
                <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-sm text-muted-foreground">
                  {accounts.length > 0 
                    ? new Date(Math.max(...accounts.map(a => new Date(a.last_sync).getTime()))).toLocaleString()
                    : "Never"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts List */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span>Connected Accounts</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No accounts connected</h3>
                <p className="text-muted-foreground mb-4">Connect your first bank account to get started</p>
                <Button 
                  onClick={() => {
                    toast.info("Plaid integration requires backend setup. Contact support for configuration.");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Account
                </Button>
              </div>
            ) : (
              accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gradient-card hover:shadow-card transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-foreground">{account.account_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {account.account_number}
                        </Badge>
                        <Badge variant={getAccountTypeColor(account.account_type)} className="text-xs">
                          {account.account_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{account.institution_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last sync: {new Date(account.last_sync).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-foreground">
                        {formatCurrency(account.balance)}
                      </p>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${account.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-muted-foreground">
                          {account.is_active ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncAccount(account.id)}
                        disabled={isSyncing === account.id}
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncing === account.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Plaid Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">About Plaid Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
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
      </div>
      
      {/* Enterprise Setup Modal */}
      <EnterpriseSetupModal 
        open={showEnterpriseSetup} 
        onOpenChange={setShowEnterpriseSetup}
      />
    </div>
  );
}