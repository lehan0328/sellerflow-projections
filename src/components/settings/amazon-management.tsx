import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useSubscription } from "@/hooks/useSubscription";
import { ShoppingCart, Plus, Trash2, RefreshCw, ExternalLink, DollarSign, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [showNotificationOptIn, setShowNotificationOptIn] = useState(false);
  const [newAccountId, setNewAccountId] = useState<string | null>(null);
  const [showSyncingBanner, setShowSyncingBanner] = useState(false);
  const [lastConnectionTime, setLastConnectionTime] = useState<Date | null>(null);
  const [canConnect, setCanConnect] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Check rate limit on mount
  useEffect(() => {
    const checkRateLimit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('last_amazon_connection')
        .eq('user_id', user.id)
        .single();

      if (profile?.last_amazon_connection) {
        const lastConn = new Date(profile.last_amazon_connection);
        setLastConnectionTime(lastConn);
        updateRateLimitStatus(lastConn);
      }
    };

    checkRateLimit();
  }, []);

  // Update rate limit status every second
  useEffect(() => {
    if (!lastConnectionTime) {
      setCanConnect(true);
      return;
    }

    const interval = setInterval(() => {
      updateRateLimitStatus(lastConnectionTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastConnectionTime]);

  const updateRateLimitStatus = (lastConn: Date) => {
    const now = new Date();
    const hoursSinceLastConnection = (now.getTime() - lastConn.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastConnection >= 3) {
      setCanConnect(true);
      setTimeRemaining("");
    } else {
      setCanConnect(false);
      const remainingMs = (3 * 60 * 60 * 1000) - (now.getTime() - lastConn.getTime());
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }
  };

  // Check for syncing parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('syncing') === 'true') {
      setShowSyncingBanner(true);
      // Remove the parameter from URL
      params.delete('syncing');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      
      // Hide banner after 10 seconds
      setTimeout(() => setShowSyncingBanner(false), 10000);
    }
    
    // Check for new account connection
    if (params.get('new_account') === 'true' && amazonAccounts.length > 0) {
      // Show notification opt-in dialog for the newest account
      const newestAccount = amazonAccounts[amazonAccounts.length - 1];
      setNewAccountId(newestAccount.id);
      setShowNotificationOptIn(true);
      
      // Clean up URL
      params.delete('new_account');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
    }
    
    // Check for manual notification opt-in trigger (for testing or re-showing)
    const accountIdParam = params.get('show_notification_optin');
    if (accountIdParam && amazonAccounts.length > 0) {
      const targetAccount = amazonAccounts.find(acc => acc.account_name === accountIdParam || acc.id === accountIdParam);
      if (targetAccount) {
        setNewAccountId(targetAccount.id);
        setShowNotificationOptIn(true);
        
        // Clean up URL
        params.delete('show_notification_optin');
        window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
      }
    }
  }, [amazonAccounts]);

  // Monitor sync status changes and update progress in real-time
  useEffect(() => {
    if (!amazonAccounts || !isSyncing) return;
    
    const syncingAccount = amazonAccounts.find(acc => acc.id === isSyncing);
    if (syncingAccount) {
      // Update progress from database
      if (syncingAccount.sync_progress !== undefined) {
        setSyncProgress(syncingAccount.sync_progress);
      }
      
      // Clear syncing state if status changed from 'syncing'
      if (syncingAccount.sync_status !== 'syncing') {
        setTimeout(() => {
          setIsSyncing(null);
          setSyncProgress(0);
        }, 1000); // Keep showing 100% for 1 second
      }
    }
  }, [amazonAccounts, isSyncing]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleConnectAmazon = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to connect your Amazon account.');
        return;
      }

      toast.info('Fetching Amazon connection details...');

      // Get Amazon SP-API Application ID from backend with auth token
      const { data, error } = await supabase.functions.invoke('get-amazon-client-id', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) {
        toast.error(`Failed to get Amazon credentials: ${error.message}`);
        return;
      }
      
      const applicationId = data?.clientId; // This should be SP-API Application ID
      
      if (applicationId && applicationId !== 'undefined' && applicationId !== '') {
        toast.error('Amazon SP-API Application ID is not configured. Please contact support.');
        return;
      }
      
      // Get the selected marketplace region
      const marketplace = marketplaces.find(m => m.id === selectedMarketplace);
      const region = marketplace?.region || 'NA';
      const consentBaseUrl = SELLER_CENTRAL_CONSENT_URLS[region];
      
      const redirectUri = `${window.location.origin}/amazon-oauth-callback`;
      
      // Construct Amazon authorization URL with region-specific consent URL
      // IMPORTANT: Use application_id (SP-API App ID), not client_id
      const authUrl = `${consentBaseUrl}?application_id=${applicationId}&state=${selectedMarketplace}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      toast.info('Redirecting to Amazon Seller Central...');
      
      // Force same-tab navigation (not new window)
      window.open(authUrl, '_self');
    } catch (error) {
      toast.error(`Failed to initiate Amazon connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setIsSyncing(accountId);
    setSyncProgress(10);
    
    try {
      const syncSuccess = await syncAmazonAccount(accountId);
      
      if (!syncSuccess) {
        // Sync was rate limited or failed
        setIsSyncing(null);
        setSyncProgress(0);
        return;
      }
      
      // Background sync started successfully
      // The realtime subscription will handle showing completion toast
      toast.info("Sync started! Watch for completion notification...");
      
      // Keep showing syncing status - will be cleared by realtime update
      setSyncProgress(50);
      
    } catch (error) {
      console.error("Sync error:", error);
      setIsSyncing(null);
      setSyncProgress(0);
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

  const handleToggleSyncNotifications = async (accountId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('amazon_accounts')
        .update({ sync_notifications_enabled: enabled })
        .eq('id', accountId);

      if (error) throw error;

      toast.success(enabled ? 'Sync email notifications enabled' : 'Sync email notifications disabled');
      
      // Refetch accounts to refresh UI without full page reload
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("amazon_accounts")
          .select('*')
          .eq("user_id", user.id)
          .eq("is_active", true);
        
        if (data) {
          window.location.reload(); // Still need reload to update the hook state
        }
      }
    } catch (error) {
      console.error('Error updating notification preference:', error);
      toast.error('Failed to update notification preference');
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
      {/* Syncing Banner */}
      {showSyncingBanner && (
        <Card className="shadow-card bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Amazon is syncing
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Please allow up to 24 hours to fully sync and to update forecast. Your Amazon data is being processed in the background.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowSyncingBanner(false)}
                className="flex-shrink-0"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Amazon Revenue Summary (Next 30 Days)</span>
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
              <p className="text-2xl font-bold text-positive">{formatCurrency(
                amazonPayouts
                  .filter(p => {
                    const payoutDate = new Date(p.payout_date);
                    const today = new Date();
                    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                    return payoutDate >= today && payoutDate <= thirtyDaysFromNow;
                  })
                  .reduce((sum, p) => sum + (p.total_amount || 0), 0)
              )}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Payouts</p>
              <p className="text-2xl font-bold text-foreground">{
                amazonPayouts.filter(p => {
                  const payoutDate = new Date(p.payout_date);
                  const today = new Date();
                  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                  return payoutDate >= today && payoutDate <= thirtyDaysFromNow;
                }).length
              }</p>
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
                  <Button disabled={!canConnect}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Amazon Account
                    {!canConnect && ` (${timeRemaining})`}
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect to Amazon Seller Central</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!canConnect && (
                    <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <ExternalLink className="h-4 w-4 text-destructive mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-destructive mb-1">Rate Limit Active</p>
                          <p className="text-xs text-muted-foreground">
                            You can connect another Amazon account in {timeRemaining}. This prevents API abuse.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                      <Label className="text-xs text-muted-foreground">
                        Payout Schedule:
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {account.payout_frequency === 'daily' ? '📅 Daily' : '📆 Bi-Weekly'} (Auto-detected)
                      </Badge>
                    </div>
                    
                    {/* Email Notification Toggle */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`sync-notifications-${account.id}`} className="text-sm cursor-pointer">
                          Email when sync completes
                        </Label>
                      </div>
                      <Switch
                        id={`sync-notifications-${account.id}`}
                        checked={account.sync_notifications_enabled || false}
                        onCheckedChange={(checked) => handleToggleSyncNotifications(account.id, checked)}
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>🔄</span>
                      Auto-sync enabled • Last: {new Date(account.last_sync).toLocaleString()}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {account.transaction_count || 0} transactions
                      </Badge>
                      {(() => {
                        if (account.initial_sync_complete) {
                          return (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              ✓ Forecast ready
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                              Processing data...
                            </Badge>
                          );
                        }
                      })()}
                    </div>
                    
                    {isSyncing === account.id && syncProgress > 0 && (
                      <div className="mt-2 space-y-1">
                        <Progress value={syncProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {account.sync_message || 
                            (syncProgress < 30 ? 'Starting sync...' : 
                             syncProgress < 70 ? 'Syncing Amazon data...' : 
                             syncProgress < 95 ? 'Processing transactions...' : 'Finalizing...')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
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

      {/* Notification Opt-in Dialog */}
      <Dialog open={showNotificationOptIn} onOpenChange={setShowNotificationOptIn}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Enable Sync Notifications?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Would you like to receive an email notification when your Amazon data sync completes?
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>Get notified immediately when sync finishes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>See transaction count and sync duration</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>You can disable this anytime in settings</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowNotificationOptIn(false);
                  toast.info('You can enable notifications anytime in Amazon Integration settings');
                }}
              >
                No Thanks
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  if (newAccountId) {
                    await handleToggleSyncNotifications(newAccountId, true);
                  }
                  setShowNotificationOptIn(false);
                }}
              >
                Yes, Notify Me
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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