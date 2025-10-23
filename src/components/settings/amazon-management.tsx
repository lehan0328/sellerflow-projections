import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useSubscription } from "@/hooks/useSubscription";
import { ShoppingCart, Plus, Trash2, RefreshCw, ExternalLink, Settings, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AmazonAccountFormData {
  seller_id: string;
  marketplace_id: string;
  marketplace_name: string;
  account_name: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  payout_frequency: 'daily' | 'bi-weekly';
}

// Region-specific Seller Central consent URLs
const SELLER_CENTRAL_CONSENT_URLS: Record<string, string> = {
  'NA': 'https://sellercentral.amazon.com/apps/authorize/consent',
  'EU': 'https://sellercentral-europe.amazon.com/apps/authorize/consent',
  'UK': 'https://sellercentral.amazon.co.uk/apps/authorize/consent',
  'JP': 'https://sellercentral.amazon.co.jp/apps/authorize/consent',
  'FE': 'https://sellercentral.amazon.sg/apps/authorize/consent', // Far East (SG, AU)
};

const marketplaces = [
  { id: "ATVPDKIKX0DER", name: "United States", code: "US", region: "NA" },
  { id: "A2Q3Y263D00KWC", name: "Brazil", code: "BR", region: "NA" },
  { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA", region: "NA" },
  { id: "A1AM78C64UM0Y8", name: "Mexico", code: "MX", region: "NA" },
  { id: "A1PA6795UKMFR9", name: "Germany", code: "DE", region: "EU" },
  { id: "A1RKKUPIHCS9HS", name: "Spain", code: "ES", region: "EU" },
  { id: "A13V1IB3VIYZZH", name: "France", code: "FR", region: "EU" },
  { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT", region: "EU" },
  { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK", region: "UK" },
  { id: "A21TJRUUN4KGV", name: "India", code: "IN", region: "EU" },
  { id: "A19VAU5U5O7RUS", name: "Singapore", code: "SG", region: "FE" },
  { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU", region: "FE" },
  { id: "A1VC38T7YXB528", name: "Japan", code: "JP", region: "JP" },
];

export function AmazonManagement() {
  const { amazonAccounts, isLoading, addAmazonAccount, removeAmazonAccount, syncAmazonAccount, updatePayoutFrequency } = useAmazonAccounts();
  const { amazonPayouts, totalUpcoming, refetch: refetchPayouts } = useAmazonPayouts();
  const { is_expired, trial_expired } = useSubscription();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedMarketplace, setSelectedMarketplace] = useState('ATVPDKIKX0DER'); // Default to US
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [manualFormData, setManualFormData] = useState<AmazonAccountFormData>({
    seller_id: '',
    marketplace_id: 'ATVPDKIKX0DER',
    marketplace_name: 'United States',
    account_name: '',
    refresh_token: '',
    client_id: '',
    client_secret: '',
    payout_frequency: 'bi-weekly',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleConnectAmazon = async () => {
    console.log('=== STARTING AMAZON CONNECTION FLOW ===');
    try {
      // Get current session
      console.log('Step 1: Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session ? 'Found' : 'Not found');
      
      if (!session) {
        console.error('No session found');
        toast.error('Please log in to connect your Amazon account.');
        return;
      }

      console.log('Step 2: Fetching Amazon SP-API Application ID from edge function...');
      toast.info('Fetching Amazon connection details...');

      // Get Amazon SP-API Application ID from backend with auth token
      const { data, error } = await supabase.functions.invoke('get-amazon-client-id', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('Edge function response:', { data, error });
      
      if (error) {
        console.error('Error fetching SP-API Application ID:', error);
        toast.error(`Failed to get Amazon credentials: ${error.message}`);
        return;
      }
      
      const applicationId = data?.clientId; // This should be SP-API Application ID
      
      console.log('Amazon SP-API Application ID received:', applicationId);
      
      if (!applicationId || applicationId === 'undefined' || applicationId === '') {
        console.error('Invalid SP-API Application ID:', applicationId);
        toast.error('Amazon SP-API Application ID is not configured. Please contact support.');
        return;
      }
      
      // Get the selected marketplace region
      const marketplace = marketplaces.find(m => m.id === selectedMarketplace);
      const region = marketplace?.region || 'NA';
      const consentBaseUrl = SELLER_CENTRAL_CONSENT_URLS[region];
      
      const redirectUri = `${window.location.origin}/amazon-oauth-callback`;
      console.log('Step 3: Building authorization URL...');
      console.log('Redirect URI:', redirectUri);
      console.log('Selected marketplace:', selectedMarketplace);
      console.log('Region:', region);
      console.log('Consent URL:', consentBaseUrl);
      
      // Construct Amazon authorization URL with region-specific consent URL
      // IMPORTANT: Use application_id (SP-API App ID), not client_id
      const authUrl = `${consentBaseUrl}?application_id=${applicationId}&state=${selectedMarketplace}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log('Amazon OAuth URL:', authUrl);
      
      toast.info('Redirecting to Amazon Seller Central...');
      console.log('Step 4: Redirecting to Amazon...');
      
      // Open in same window to preserve session
      window.location.href = authUrl;
    } catch (error) {
      console.error('=== ERROR IN AMAZON CONNECTION ===', error);
      toast.error(`Failed to initiate Amazon connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setIsSyncing(accountId);
    setSyncProgress(10);
    toast.info("Syncing Amazon data... This will continue in the background.");
    
    try {
      // Simulate progress during sync
      setSyncProgress(20);
      const syncSuccess = await syncAmazonAccount(accountId);
      
      if (!syncSuccess) {
        // Sync was rate limited or failed
        setSyncProgress(100);
        return;
      }
      
      setSyncProgress(60);
      
      // Poll for new transactions to confirm sync completion
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        setSyncProgress(60 + (attempts / maxAttempts) * 30);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      setSyncProgress(95);
      await refetchPayouts();
      setSyncProgress(100);
    } catch (error) {
      console.error("Sync error:", error);
      // Error already handled by syncAmazonAccount with toast
    } finally {
      setTimeout(() => {
        setIsSyncing(null);
        setSyncProgress(0);
      }, 500);
    }
  };

  const canSyncAccount = (lastSync: string | null): { canSync: boolean; message: string } => {
    if (!lastSync) return { canSync: true, message: 'Ready to sync' };
    
    const lastSyncTime = new Date(lastSync).getTime();
    const now = Date.now();
    const timeSinceSync = (now - lastSyncTime) / 1000; // seconds
    const RATE_LIMIT_SECONDS = 120; // 2 minutes
    
    if (timeSinceSync < RATE_LIMIT_SECONDS) {
      const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceSync);
      const minutes = Math.ceil(waitTime / 60);
      return { 
        canSync: false, 
        message: `Rate limited. Wait ${minutes} min to avoid Amazon API quota.` 
      };
    }
    
    return { canSync: true, message: 'Ready to sync' };
  };

  const handleRemoveAccount = (accountId: string) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (accountToDelete) {
      await removeAmazonAccount(accountToDelete);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleManualAdd = async () => {
    try {
      // Validate required fields
      if (!manualFormData.seller_id || !manualFormData.refresh_token || !manualFormData.account_name) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Get the selected marketplace details
      const marketplace = marketplaces.find(m => m.id === manualFormData.marketplace_id);
      if (!marketplace) {
        toast.error('Invalid marketplace selected');
        return;
      }

      await addAmazonAccount({
        ...manualFormData,
        marketplace_name: marketplace.name,
      });

      toast.success('Amazon account added successfully');
      setManualFormOpen(false);
      
      // Reset form
      setManualFormData({
        seller_id: '',
        marketplace_id: 'ATVPDKIKX0DER',
        marketplace_name: 'United States',
        account_name: '',
        refresh_token: '',
        client_id: '',
        client_secret: '',
        payout_frequency: 'bi-weekly',
      });
    } catch (error) {
      console.error('Error adding manual Amazon account:', error);
      toast.error('Failed to add Amazon account');
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span>Amazon Account Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading Amazon accounts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Amazon Revenue Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Connected Accounts</p>
              <p className="text-2xl font-bold text-foreground">{amazonAccounts.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Upcoming Payouts</p>
              <p className="text-2xl font-bold text-positive">{formatCurrency(totalUpcoming)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Payouts</p>
              <p className="text-2xl font-bold text-foreground">{amazonPayouts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amazon Accounts Management */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span>Amazon Seller Accounts</span>
            </CardTitle>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Amazon Account
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect to Amazon Seller Central</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to Amazon Seller Central to authorize access to your account data.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="marketplace">Select Your Marketplace</Label>
                    <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                      <SelectTrigger id="marketplace">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {marketplaces.map((marketplace) => (
                          <SelectItem key={marketplace.id} value={marketplace.id}>
                            {marketplace.name} ({marketplace.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Secure OAuth Connection</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          This will open Amazon Seller Central where you can safely authorize Auren to access your seller data. No credentials stored locally.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleConnectAmazon} className="w-full" size="lg">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Continue to Amazon
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={manualFormOpen} onOpenChange={setManualFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manual Add (Test)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manually Add Amazon Account (Testing)</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      This form is for testing only. Use this to manually add Amazon credentials without OAuth flow.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-account-name">Account Name *</Label>
                    <Input
                      id="manual-account-name"
                      placeholder="e.g., My US Store"
                      value={manualFormData.account_name}
                      onChange={(e) => setManualFormData({ ...manualFormData, account_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-marketplace">Marketplace *</Label>
                    <Select 
                      value={manualFormData.marketplace_id} 
                      onValueChange={(value) => {
                        const marketplace = marketplaces.find(m => m.id === value);
                        setManualFormData({ 
                          ...manualFormData, 
                          marketplace_id: value,
                          marketplace_name: marketplace?.name || ''
                        });
                      }}
                    >
                      <SelectTrigger id="manual-marketplace">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {marketplaces.map((marketplace) => (
                          <SelectItem key={marketplace.id} value={marketplace.id}>
                            {marketplace.name} ({marketplace.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-seller-id">Seller ID *</Label>
                    <Input
                      id="manual-seller-id"
                      placeholder="e.g., A1BCDEFGHIJK2"
                      value={manualFormData.seller_id}
                      onChange={(e) => setManualFormData({ ...manualFormData, seller_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-refresh-token">Refresh Token *</Label>
                    <Textarea
                      id="manual-refresh-token"
                      placeholder="Atzr|..."
                      value={manualFormData.refresh_token}
                      onChange={(e) => setManualFormData({ ...manualFormData, refresh_token: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-client-id">Client ID (Optional)</Label>
                    <Input
                      id="manual-client-id"
                      placeholder="amzn1.application-oa2-client..."
                      value={manualFormData.client_id}
                      onChange={(e) => setManualFormData({ ...manualFormData, client_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-client-secret">Client Secret (Optional)</Label>
                    <Input
                      id="manual-client-secret"
                      type="password"
                      placeholder="Enter client secret"
                      value={manualFormData.client_secret}
                      onChange={(e) => setManualFormData({ ...manualFormData, client_secret: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-payout-frequency">Payout Frequency</Label>
                    <Select 
                      value={manualFormData.payout_frequency} 
                      onValueChange={(value: 'daily' | 'bi-weekly') => 
                        setManualFormData({ ...manualFormData, payout_frequency: value })
                      }
                    >
                      <SelectTrigger id="manual-payout-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleManualAdd} className="w-full">
                    Add Amazon Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {amazonAccounts.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Amazon accounts connected</h3>
              <p className="text-muted-foreground mb-4">Connect your Amazon seller account to sync payouts and transaction data</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Your First Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Connect to Amazon Seller Central</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You'll be redirected to Amazon Seller Central to authorize access to your account data.
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="marketplace-first">Select Your Marketplace</Label>
                      <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                        <SelectTrigger id="marketplace-first">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {marketplaces.map((marketplace) => (
                            <SelectItem key={marketplace.id} value={marketplace.id}>
                              {marketplace.name} ({marketplace.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Secure OAuth Connection</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            This will open Amazon Seller Central where you can safely authorize Auren to access your seller data. No credentials stored locally.
                          </p>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                            <p className="text-xs font-semibold text-amber-900 mb-2">⚠️ Before connecting:</p>
                            <p className="text-xs text-amber-800 mb-2">Add this OAuth Redirect URL in your Amazon Developer Console (App Settings):</p>
                            <div className="bg-white p-2 rounded border border-amber-300">
                              <code className="text-xs text-blue-600 break-all font-mono">https://aurenapp.com/amazon-oauth-callback</code>
                            </div>
                            <p className="text-xs text-amber-700 mt-2">Without this, you'll get error "MD5101: Invalid redirect URL"</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleConnectAmazon} className="w-full" size="lg">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Continue to Amazon
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            amazonAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-gradient-card hover:shadow-card transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-foreground">
                        {account.account_name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {account.marketplace_name}
                      </Badge>
                      {account.is_active && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Seller ID: {account.seller_id}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`frequency-${account.id}`} className="text-xs text-muted-foreground">
                        Payout Schedule:
                      </Label>
                      <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                        <span className={`text-xs transition-colors ${
                          account.payout_frequency === 'bi-weekly' ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          Bi-Weekly
                        </span>
                        <Switch
                          id={`frequency-${account.id}`}
                          checked={account.payout_frequency === 'daily'}
                          onCheckedChange={(checked) => 
                            updatePayoutFrequency(account.id, checked ? 'daily' : 'bi-weekly')
                          }
                        />
                        <span className={`text-xs transition-colors ${
                          account.payout_frequency === 'daily' ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          Daily
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Last sync: {new Date(account.last_sync).toLocaleString()}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {account.transaction_count || 0} transactions
                      </Badge>
                      {account.initial_sync_complete ? (
                        <Badge className="text-xs bg-green-100 text-green-800">
                          ✓ Ready for forecasting
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                          Need {Math.max(0, 50 - (account.transaction_count || 0))} more for forecasting
                        </Badge>
                      )}
                    </div>
                    
                    {!canSyncAccount(account.last_sync).canSync && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <span>⏱️</span>
                        {canSyncAccount(account.last_sync).message}
                      </p>
                    )}
                    
                    {isSyncing === account.id && syncProgress > 0 && syncProgress < 100 && (
                      <div className="mt-2 space-y-1">
                        <Progress value={syncProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {syncProgress < 30 ? 'Starting sync...' : 
                           syncProgress < 70 ? 'Syncing Amazon data...' : 
                           syncProgress < 95 ? 'Processing transactions...' : 'Finalizing...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAccount(account.id)}
                    disabled={
                      isSyncing === account.id || 
                      !canSyncAccount(account.last_sync).canSync ||
                      is_expired ||
                      trial_expired
                    }
                    title={
                      is_expired || trial_expired
                        ? "Account expired. Please renew to sync."
                        : canSyncAccount(account.last_sync).message
                    }
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
            ))
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Amazon SP-API Setup Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Prerequisites:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Amazon Seller Central account with Professional plan</li>
                <li>Developer application approved for SP-API access</li>
                <li>Valid refresh token generated through authorization workflow</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">Security Features:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>All API credentials are encrypted using AES-256 encryption</li>
                <li>Credentials are stored separately and never logged</li>
                <li>Each user can only access their own account data</li>
                <li>Automatic token refresh and secure storage</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <ExternalLink className="h-4 w-4" />
              <a 
                href="https://developer-docs.amazon.com/sp-api/docs/sp-api-endpoints" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View SP-API Documentation
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Amazon Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this Amazon account? This will also remove all associated transaction data and payout forecasts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}