import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

interface PlaidAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
  type: "depository" | "credit" | "loan" | "investment";
  lastSync: string;
  institutionName: string;
  isConnected: boolean;
}

// Mock data - in real app this would come from Plaid/Supabase
const mockAccounts: PlaidAccount[] = [
  {
    id: "1",
    name: "Bank of America Checking",
    accountNumber: "****7034",
    balance: 14269.39,
    type: "depository",
    lastSync: new Date().toISOString(),
    institutionName: "Bank of America",
    isConnected: true,
  },
  {
    id: "2",
    name: "Bluevine Business Checking",
    accountNumber: "****7080",
    balance: 4.29,
    type: "depository",
    lastSync: new Date().toISOString(),
    institutionName: "Bluevine",
    isConnected: true,
  },
];

export default function ManageAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PlaidAccount[]>(mockAccounts);
  const [isLoading, setIsLoading] = useState(false);

  // Plaid Link configuration
  const config = {
    token: null, // In real app, get this from your backend
    onSuccess: (public_token: string, metadata: any) => {
      // In real app, send public_token to your backend to exchange for access_token
      console.log("Plaid Link success:", { public_token, metadata });
      toast.success("Bank account connected successfully!");
      
      // Mock adding new account
      const newAccount: PlaidAccount = {
        id: Date.now().toString(),
        name: `${metadata.institution.name} Account`,
        accountNumber: "****" + Math.random().toString().slice(-4),
        balance: Math.random() * 10000,
        type: "depository",
        lastSync: new Date().toISOString(),
        institutionName: metadata.institution.name,
        isConnected: true,
      };
      setAccounts(prev => [...prev, newAccount]);
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
    setIsLoading(true);
    try {
      // In real app, call your backend to sync account data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, lastSync: new Date().toISOString() }
            : account
        )
      );
      toast.success("Account synced successfully!");
    } catch (error) {
      toast.error("Failed to sync account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = (accountId: string) => {
    setAccounts(prev => prev.filter(account => account.id !== accountId));
    toast.success("Account removed successfully!");
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

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

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
            onClick={() => open()}
            disabled={!ready}
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
                    ? new Date(Math.max(...accounts.map(a => new Date(a.lastSync).getTime()))).toLocaleString()
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
                <Button onClick={() => open()} disabled={!ready}>
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
                        <h4 className="font-semibold text-foreground">{account.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {account.accountNumber}
                        </Badge>
                        <Badge variant={getAccountTypeColor(account.type)} className="text-xs">
                          {account.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{account.institutionName}</p>
                      <p className="text-xs text-muted-foreground">
                        Last sync: {new Date(account.lastSync).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-foreground">
                        {formatCurrency(account.balance)}
                      </p>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${account.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-muted-foreground">
                          {account.isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncAccount(account.id)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
    </div>
  );
}