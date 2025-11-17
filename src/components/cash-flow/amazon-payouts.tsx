import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, TrendingUp, Calendar, Settings, RefreshCw, Sparkles, Clock, Plus, Loader2, FileText, AlertCircle } from "lucide-react";
import { AmazonSettledPayouts } from "./amazon-settled-payouts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { CleanupDuplicateAmazonButton } from "./cleanup-duplicate-amazon-button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Region-specific Seller Central consent URLs
const SELLER_CENTRAL_CONSENT_URLS: Record<string, string> = {
  'NA': 'https://sellercentral.amazon.com/apps/authorize/consent',
  'EU': 'https://sellercentral-europe.amazon.com/apps/authorize/consent',
  'UK': 'https://sellercentral.amazon.co.uk/apps/authorize/consent',
  'JP': 'https://sellercentral.amazon.co.jp/apps/authorize/consent',
  'FE': 'https://sellercentral.amazon.sg/apps/authorize/consent', // Far East (SG, AU)
};

const marketplaces = [
  { id: "ATVPDKIKX0DER", name: "United States", region: "NA" },
  { id: "A2Q3Y263D00KWC", name: "Brazil", region: "NA" },
  { id: "A2EUQ1WTGCTBG2", name: "Canada", region: "NA" },
  { id: "A1AM78C64UM0Y8", name: "Mexico", region: "NA" },
  { id: "A1PA6795UKMFR9", name: "Germany", region: "EU" },
  { id: "A1RKKUPIHCS9HS", name: "Spain", region: "EU" },
  { id: "A13V1IB3VIYZZH", name: "France", region: "EU" },
  { id: "APJ6JRA9NG5V4", name: "Italy", region: "EU" },
  { id: "A1F83G8C2ARO7P", name: "United Kingdom", region: "UK" },
  { id: "A21TJRUUN4KGV", name: "India", region: "EU" },
  { id: "A19VAU5U5O7RUS", name: "Singapore", region: "FE" },
  { id: "A39IBJ37TRP1C6", name: "Australia", region: "FE" },
  { id: "A1VC38T7YXB528", name: "Japan", region: "JP" },
];

// Color palette for Amazon accounts
const ACCOUNT_COLORS = [
  { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  { border: 'border-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', dot: 'bg-pink-500' },
  { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  { border: 'border-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  { border: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
];

export function AmazonPayouts() {
  const navigate = useNavigate();
  const {
    amazonPayouts,
    isLoading,
    totalUpcoming,
    totalEstimated,
    refetch
  } = useAmazonPayouts();
  const {
    amazonAccounts,
    syncAmazonAccount,
    refetch: refetchAccounts
  } = useAmazonAccounts();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showForecasts, setShowForecasts] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState("ATVPDKIKX0DER");
  const [showSettledPayouts, setShowSettledPayouts] = useState(false);
  const [advancedModelingEnabled, setAdvancedModelingEnabled] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | "all">("all");
  
  // Function to get color for an account
  const getAccountColor = (accountId: string) => {
    const index = amazonAccounts.findIndex(acc => acc.id === accountId);
    const colorIndex = index >= 0 ? index % ACCOUNT_COLORS.length : 0;
    return ACCOUNT_COLORS[colorIndex];
  };
  
  // Date range filter - default to current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [startDateFilter, setStartDateFilter] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDateFilter, setEndDateFilter] = useState(lastDayOfMonth.toISOString().split('T')[0]);
  
  // Fetch advanced modeling setting
  useEffect(() => {
    const fetchAdvancedModelingSetting = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('user_settings')
        .select('advanced_modeling_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setAdvancedModelingEnabled(data?.advanced_modeling_enabled ?? false);
    };
    
    fetchAdvancedModelingSetting();
  }, []);
  
  // Count settled payouts
  const settledPayoutsCount = amazonPayouts.filter(p => 
    p.status === 'confirmed' || p.status === 'estimated'
  ).length;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };
  const getDaysUntil = (dateString: string) => {
    // Normalize both dates to midnight local time for accurate day calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const payoutDate = new Date(dateString);
    payoutDate.setHours(0, 0, 0, 0);
    
    const diffTime = payoutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "estimated":
        return "secondary";
      case "processing":
        return "outline";
      default:
        return "secondary";
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case "bi-weekly":
        return "default";
      case "reserve-release":
        return "destructive";
      case "adjustment":
        return "secondary";
      default:
        return "default";
    }
  };
  const handleSyncAllAccounts = async () => {
    if (amazonAccounts.length === 0) return;
    
    // Check if any account is currently syncing or rate limited
    const syncingAccount = amazonAccounts.find(acc => acc.sync_status === 'syncing');
    if (syncingAccount) {
      toast.error('Sync already in progress. Please wait...');
      return;
    }

    // Check for rate limit messages
    const rateLimitedAccount = amazonAccounts.find(acc => 
      acc.sync_message?.includes('Rate limited')
    );
    
    if (rateLimitedAccount && rateLimitedAccount.sync_message) {
      // Extract wait time from message
      const waitMatch = rateLimitedAccount.sync_message.match(/Wait (\d+)s/);
      if (waitMatch) {
        const waitSeconds = parseInt(waitMatch[1]);
        toast.error(`Rate limited. Please wait ${Math.ceil(waitSeconds / 60)} more minutes before syncing.`);
        return;
      }
    }

    toast.success('Syncing Amazon data...');
    
    for (const account of amazonAccounts) {
      setIsSyncing(account.id);
      try {
        await syncAmazonAccount(account.id);
        toast.success(`Sync started for ${account.account_name}`);
      } catch (error) {
        console.error(`Failed to sync account ${account.id}:`, error);
        toast.error(`Failed to sync ${account.account_name}`);
      }
    }
    setIsSyncing(null);
  };

  const handleForceFullResync = async () => {
    if (amazonAccounts.length === 0) return;
    
    try {
      toast.loading('Resetting sync status...');
      
      for (const account of amazonAccounts) {
        const { error } = await supabase
          .from('amazon_accounts')
          .update({
            last_synced_to: null,
            last_report_sync: null, // Clear this to force order report re-sync with new calculation
            initial_sync_complete: false,
            sync_status: 'idle',
            sync_progress: 0,
            sync_message: 'Ready to sync - will fetch full history with updated revenue calculation'
          })
          .eq('id', account.id);
        
        if (error) throw error;
      }
      
      toast.dismiss();
      toast.success('Sync status reset! Click "Sync" to fetch full payout history.');
      refetch();
    } catch (error: any) {
      console.error('Failed to reset sync:', error);
      toast.dismiss();
      toast.error('Failed to reset sync status');
    }
  };

  const handleDeleteEstimatedSettlements = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to delete estimated settlements.');
        return;
      }

      setIsSyncing('deleting-estimated');
      toast.info('Deleting estimated settlements...');

      const { data, error } = await supabase.functions.invoke('delete-estimated-settlements', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error(`Failed to delete: ${error.message}`);
      } else {
        toast.success(data.message || `Deleted ${data.deletedCount} settlements`);
        await refetch();
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleFetchOpenSettlement = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to fetch open settlement.');
        return;
      }

      if (amazonAccounts.length === 0) {
        toast.error('No Amazon accounts connected.');
        return;
      }

      setIsSyncing('fetching-settlement');
      toast.info('Fetching open settlement...');

      const { data, error } = await supabase.functions.invoke('fetch-amazon-open-settlement', {
        body: { amazonAccountId: amazonAccounts[0].id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error(`Failed to fetch settlement: ${error.message}`);
      } else {
        toast.success(`Found ${data.settlementsFound} settlements`);
        await refetch();
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleSyncReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to sync reports.');
        return;
      }

      if (amazonAccounts.length === 0) {
        toast.error('No Amazon accounts connected.');
        return;
      }

      setIsSyncing('syncing-reports');
      toast.info('Syncing order reports (last 14 days)...');

      const { data, error } = await supabase.functions.invoke('sync-amazon-reports-daily', {
        body: { 
          amazonAccountId: amazonAccounts[0].id,
          days: 14
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error(`Failed to sync reports: ${error.message}`);
      } else {
        toast.success(`Synced ${data.ordersCount} orders`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(null);
    }
  };


  const handleConnectAmazon = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to connect your Amazon account.');
        return;
      }

      toast.info('Fetching Amazon connection details...');

      // Get Amazon SP-API Application ID from backend
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
      
      if (!applicationId || applicationId === 'undefined' || applicationId === '') {
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
      
      toast.info('Opening Amazon Seller Central in a new tab...');
      
      // CRITICAL: Open in new tab to avoid iframe blocking (X-Frame-Options: DENY)
      const newWindow = window.open(authUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups and try again.');
      } else {
        toast.success('Amazon authorization opened in new tab. Please complete the process there.');
        setShowConnectDialog(false);
      }
    } catch (error) {
      toast.error(`Failed to initiate Amazon connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  if (isLoading) {
    return <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span>Amazon Payouts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading Amazon payouts...</p>
        </CardContent>
      </Card>;
  }
  return <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <CardTitle>Amazon Payouts</CardTitle>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard?view=settings&section=amazon')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            {/* Show open settlement unless daily forecasting is enabled */}
            {totalEstimated > 0 && !advancedModelingEnabled && (
              <div className="text-sm text-muted-foreground">
                Open Settlement: <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalEstimated)}
                </span>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Expected: <span className="font-semibold text-finance-positive">
                {formatCurrency(totalUpcoming)}
              </span>
            </div>
            {amazonAccounts.length > 0 && <>
                <div className="text-xs text-muted-foreground">
                  Last sync: {amazonAccounts[0]?.last_sync ? new Date(amazonAccounts[0].last_sync).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              }) : 'Never'}
                </div>
              </>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Error Alert */}
        {amazonAccounts.some(acc => acc.sync_status === 'error' || acc.last_sync_error) && (
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              {amazonAccounts
                .filter(acc => acc.sync_status === 'error' || acc.last_sync_error)
                .map(account => (
                  <div key={account.id} className="space-y-1">
                    <p className="font-semibold">{account.account_name}</p>
                    <p className="text-sm">{account.last_sync_error || account.sync_message || 'Sync error occurred'}</p>
                  </div>
                ))}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Sync Progress Indicator */}
        {amazonAccounts.some(acc => acc.sync_status === 'syncing') && (
          <div className="p-4 rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {amazonAccounts.filter(acc => acc.sync_status === 'syncing').map(account => (
                  <div key={account.id} className="space-y-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                      Syncing: {account.account_name}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-200">
                      {account.sync_message || 'Fetching data from Amazon...'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 font-mono">
                      Transactions: {account.transaction_count?.toLocaleString() || 0}
                    </p>
                    {account.sync_progress !== undefined && account.sync_progress > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {account.sync_message || 'Starting sync...'}
                          </p>
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {account.sync_progress}%
                          </span>
                        </div>
                        <div className="bg-blue-200 dark:bg-blue-900 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${account.sync_progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Amazon Account Connection Status */}
        {amazonAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Connected Amazon Accounts</h4>
              <Badge variant="outline" className="text-xs">
                {amazonAccounts.length} {amazonAccounts.length === 1 ? 'Account' : 'Accounts'}
              </Badge>
            </div>
            <div className="space-y-2">
              {amazonAccounts.map((account) => {
                const hoursSinceSync = account.last_sync 
                  ? (Date.now() - new Date(account.last_sync).getTime()) / (1000 * 60 * 60)
                  : null;
                const hasRecentSync = hoursSinceSync !== null && hoursSinceSync < 24;
                const showWarning = !account.initial_sync_complete && hoursSinceSync !== null && hoursSinceSync > 24;
                
                const accountColor = getAccountColor(account.id);
                
                return (
                  <div key={account.id} className={`flex items-center justify-between text-sm p-2 rounded border-l-4 ${accountColor.border} ${accountColor.bg}`}>
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-2 h-2 rounded-full ${accountColor.dot} flex-shrink-0`} />
                      <ShoppingCart className={`h-4 w-4 flex-shrink-0 ${accountColor.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{account.account_name}</span>
                          <span className="text-muted-foreground text-xs">({account.marketplace_name})</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {account.sync_message || 'No sync data'}
                        </div>
                        {account.sync_progress && account.sync_progress < 100 && account.sync_status !== 'idle' && (
                          <div className="mt-1">
                            <Progress value={account.sync_progress} className="h-1" />
                          </div>
                        )}
                      </div>
                    </div>
                     <div className="flex items-center gap-2 flex-shrink-0">
                      {account.sync_progress >= 100 && account.initial_sync_complete ? (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                          ✓ Synced
                        </Badge>
                      ) : account.sync_status === 'syncing' && account.transaction_count === 0 && hoursSinceSync && hoursSinceSync >= 0.5 ? (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">
                          Stuck
                        </Badge>
                      ) : account.sync_progress && account.sync_progress > 0 ? (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
                          {account.sync_progress}% Syncing
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                          Starting...
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={account.sync_status === 'syncing' || isSyncing === account.id}
                        onClick={async () => {
                          try {
                            setIsSyncing(account.id);
                            await syncAmazonAccount(account.id);
                            toast.success('Sync initiated successfully');
                          } catch (error: any) {
                            console.error('Sync error:', error);
                            toast.error(error.message || 'Failed to sync account');
                          } finally {
                            setIsSyncing(null);
                          }
                        }}
                        className="h-7 px-2"
                      >
                        {isSyncing === account.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Daily Account Information Alert */}
        {amazonAccounts.some(acc => acc.payout_frequency === 'daily') && 
         amazonPayouts.some(p => p.status === 'estimated' && p.amazon_accounts?.payout_frequency === 'daily') && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Daily Account Information:</strong> Open settlements shown below are for reference only and are not included in cash flow calculations. 
              Your daily forecasts provide more accurate day-by-day projections based on actual sales velocity.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Open Settlements - Always visible at top */}
        {(() => {
          const todayStr = new Date().toISOString().split('T')[0];
          
          // Show open settlements where today's date falls within the settlement period
          const openSettlements = amazonPayouts.filter(p => {
            // Filter by account first
            if (selectedAccountId !== 'all' && p.amazon_account_id !== selectedAccountId) {
              return false;
            }
            
            const rawData = p.raw_settlement_data;
            const hasEndDate = !!(rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date);
            const isEstimated = p.status === 'estimated';
            
            // Must be estimated and have no end date
            if (!isEstimated || hasEndDate) return false;
            
            // Get settlement start date
            const settlementStart = rawData?.FinancialEventGroupStart || rawData?.settlement_start_date;
            if (!settlementStart) return false;
            
            const startDate = new Date(settlementStart);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Check if payout_date is in the future (settlement still open)
            const payoutDate = new Date(p.payout_date);
            payoutDate.setHours(0, 0, 0, 0);
            
            if (payoutDate < today) {
              // Payout date has passed, don't show
              return false;
            }
            
            // Also check start date is not too far in the past
            startDate.setHours(0, 0, 0, 0);
            if (today < startDate) {
              // Settlement hasn't started yet
              return false;
            }
            
            return true;
          });
          
          if (openSettlements.length === 0) {
            return null;
          }

          return (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Open Settlements (In Progress)
              </h3>
              {openSettlements.map(payout => {
                const rawData = payout.raw_settlement_data;
                const startDate = rawData?.FinancialEventGroupStart ? new Date(rawData.FinancialEventGroupStart) : null;
                
                // For bi-weekly, settlement period is 14 days
                const estimatedEnd = startDate ? new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
                
                // Use the close date for the payout date
                const estimatedPayoutDate = estimatedEnd;
                const daysUntil = estimatedPayoutDate ? getDaysUntil(estimatedPayoutDate.toISOString().split('T')[0]) : 0;
                const accountColor = getAccountColor(payout.amazon_account_id);

                return (
                  <div key={payout.id} className={`rounded-lg border-l-4 ${accountColor.border} border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 transition-all hover:shadow-card`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${accountColor.dot}`} />
                          <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                          <Badge variant={getTypeColor(payout.payout_type)} className="text-xs">
                            {payout.payout_type.replace("-", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {payout.amazon_accounts?.marketplace_name || payout.marketplace_name}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {startDate && estimatedEnd ? (
                                `Period: ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${estimatedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              ) : (
                                `Started: ${payout.payout_date}`
                              )}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {rawData?.BeginningBalance?.CurrencyAmount !== undefined && (
                              <span>Opening: {formatCurrency(rawData.BeginningBalance.CurrencyAmount)}</span>
                            )}
                            {rawData?.ProcessingStatus && (
                              <>
                                {rawData?.BeginningBalance?.CurrencyAmount !== undefined && <span>•</span>}
                                <span>Status: {rawData.ProcessingStatus}</span>
                              </>
                            )}
                            {estimatedPayoutDate && (
                              <>
                                {(rawData?.BeginningBalance?.CurrencyAmount !== undefined || rawData?.ProcessingStatus) && <span>•</span>}
                                <span className="font-medium text-green-600 dark:text-green-400">Closes & Pays: {estimatedPayoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Confirmed)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-amber-600 dark:text-amber-400">
                          {formatCurrency(payout.total_amount)}
                        </p>
                        <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="mr-1 h-3 w-3" />
                          Accumulating
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Filters */}
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
          {/* Account Filter */}
          {amazonAccounts.length > 1 && (
            <>
              <Label className="text-sm font-medium whitespace-nowrap">Amazon Account:</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {amazonAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} ({account.marketplace_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-6 w-px bg-border mx-2" />
            </>
          )}
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-3 flex-1">
            <Label className="text-sm font-medium whitespace-nowrap">Settlement Period:</Label>
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-auto"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setStartDateFilter(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                setEndDateFilter(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
              }}
            >
              This Month
            </Button>
          </div>
          <div className="flex items-center gap-4 border-l pl-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Closed Settlements</div>
              <div className="text-sm font-medium">
                {amazonPayouts.filter(p => 
                  p.status === 'confirmed' && 
                  p.payout_date >= startDateFilter && 
                  p.payout_date <= endDateFilter &&
                  (selectedAccountId === 'all' || p.amazon_account_id === selectedAccountId)
                ).length}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Paid Out</div>
              <div className="text-lg font-bold text-finance-positive">
                {formatCurrency(
                  amazonPayouts
                    .filter(p => 
                      p.status === 'confirmed' && 
                      p.payout_date >= startDateFilter && 
                      p.payout_date <= endDateFilter &&
                      (selectedAccountId === 'all' || p.amazon_account_id === selectedAccountId)
                    )
                    .reduce((sum, p) => sum + p.total_amount, 0)
                )}
              </div>
            </div>
          </div>
        </div>
        
        {amazonPayouts.length === 0 ? <div className="space-y-4">
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Amazon payouts found</h3>
              <p className="text-muted-foreground mb-4">
                {amazonAccounts.length === 0 ? "Connect your Amazon seller account to see payouts" : "Sync your Amazon accounts to load payout data"}
              </p>
              <Button onClick={() => amazonAccounts.length === 0 ? setShowConnectDialog(true) : navigate('/dashboard?view=settings&section=amazon')}>
                {amazonAccounts.length === 0 ? <Plus className="h-4 w-4 mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
                {amazonAccounts.length === 0 ? "Connect Amazon Account" : "Manage Amazon Settings"}
              </Button>
            </div>
          </div> : (() => {
          // Show only CONFIRMED settlements (never forecasted or open)
          const filteredPayouts = amazonPayouts.filter(payout => {
            // Only show confirmed settlements
            if (payout.status !== 'confirmed') {
              return false;
            }
            
            // Filter by account
            if (selectedAccountId !== 'all' && payout.amazon_account_id !== selectedAccountId) {
              return false;
            }
            
            // Filter by date range
            const payoutDate = payout.payout_date;
            return payoutDate >= startDateFilter && payoutDate <= endDateFilter;
          });
          
          // Group by unique combination of payout_date AND settlement_id to keep them separate
          const payoutsByKey = filteredPayouts.reduce((acc, payout) => {
            const key = `${payout.payout_date}-${payout.settlement_id}`;
            if (!acc[key]) {
              acc[key] = {
                ...payout,
                payouts: [payout]
              };
            }
            return acc;
          }, {} as Record<string, any>);
          
          return Object.values(payoutsByKey).map(aggregatedPayout => {
            const firstPayout = aggregatedPayout.payouts[0];
            const rawData = firstPayout?.raw_settlement_data;
            const endDate = rawData?.FinancialEventGroupEnd ? new Date(rawData.FinancialEventGroupEnd) : null;
            
            // Amazon payouts arrive 1 day after settlement closes
            const actualPayoutDate = endDate ? new Date(endDate.getTime() + 1 * 24 * 60 * 60 * 1000) : new Date(aggregatedPayout.payout_date);
            const daysUntil = getDaysUntil(actualPayoutDate.toISOString().split('T')[0]);
            const isUpcoming = daysUntil <= 7 && daysUntil >= 0;
            const isForecasted = aggregatedPayout.status === 'forecasted';
            const accountColor = getAccountColor(firstPayout.amazon_account_id);
            
            return <div key={`${aggregatedPayout.payout_date}-${aggregatedPayout.settlement_id}`} className={`rounded-lg border-l-4 ${accountColor.border} border bg-gradient-card p-4 transition-all hover:shadow-card ${isUpcoming ? 'border-primary/30 bg-primary/5' : ''} ${isForecasted ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${accountColor.dot}`} />
                          {isForecasted && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Forecast
                            </Badge>
                          )}
                          <Badge variant={getStatusColor(aggregatedPayout.status)} className="text-xs">
                            {aggregatedPayout.status}
                          </Badge>
                          <Badge variant={getTypeColor(aggregatedPayout.payout_type)} className="text-xs">
                            {aggregatedPayout.payout_type.replace("-", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {aggregatedPayout.marketplace_name}
                          </span>
                          {aggregatedPayout.payouts.length > 1 && <Badge variant="secondary" className="text-xs">
                              {aggregatedPayout.payouts.length} accounts
                            </Badge>}
                        </div>
                         <div className="space-y-1">
                             <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-3 w-3" />
                                {(() => {
                                  // Show settlement period with more details
                                  const firstPayout = aggregatedPayout.payouts[0];
                                  const rawData = firstPayout?.raw_settlement_data;
                                  
                                  if (rawData?.FinancialEventGroupStart) {
                                    const startDate = new Date(rawData.FinancialEventGroupStart);
                                    const endDate = rawData.FinancialEventGroupEnd 
                                      ? new Date(rawData.FinancialEventGroupEnd)
                                      : null;
                                    
                                    const formatShort = (date: Date) => date.toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    });
                                    
                                    if (endDate) {
                                      // CRITICAL: Use payout_date + 1 day for arrival (payout_date is settlement close date)
                                      const payoutArrival = new Date(aggregatedPayout.payout_date);
                                      payoutArrival.setDate(payoutArrival.getDate() + 1);
                                      const isConfirmed = aggregatedPayout.status === 'confirmed';
                                      return `Period: ${formatShort(startDate)} - ${formatShort(endDate)} → ${isConfirmed ? 'Arrived' : 'Arrives'}: ${formatShort(payoutArrival)}`;
                                    } else {
                                      // Calculate estimated end date for open settlements (14 days for bi-weekly)
                                      const estimatedEnd = new Date(startDate);
                                      estimatedEnd.setDate(estimatedEnd.getDate() + 14);
                                      return `Period: ${formatShort(startDate)} - ${formatShort(estimatedEnd)} (Open)`;
                                    }
                                  }
                                  
                                  return `Settlement Date: ${formatDate(aggregatedPayout.payout_date)}`;
                                })()}
                              </span>
                              <span className={`font-medium ${daysUntil === 0 ? 'text-finance-positive' : daysUntil <= 3 && daysUntil >= 0 ? 'text-warning' : daysUntil < 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {daysUntil === 0 ? 'Arrived Today' : daysUntil > 0 ? `Arrives in ${daysUntil} days` : `Arrived ${Math.abs(daysUntil)} days ago`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              {(() => {
                                const firstPayout = aggregatedPayout.payouts[0];
                                const rawData = firstPayout?.raw_settlement_data;
                                const details = [];
                                
                                // Beginning balance
                                if (rawData?.BeginningBalance?.CurrencyAmount !== undefined) {
                                  details.push(`Opening: ${formatCurrency(rawData.BeginningBalance.CurrencyAmount)}`);
                                }
                                
                                // Fund transfer status
                                if (rawData?.FundTransferStatus) {
                                  details.push(`Transfer: ${rawData.FundTransferStatus}`);
                                }
                                
                                // Account tail
                                if (rawData?.AccountTail) {
                                  details.push(`Account: •••${rawData.AccountTail}`);
                                }
                                
                                // Processing status
                                if (rawData?.ProcessingStatus) {
                                  details.push(`Status: ${rawData.ProcessingStatus}`);
                                }
                                
                                return details.map((detail, i) => (
                                  <span key={i} className="flex items-center">
                                    {i > 0 && <span className="mx-2">•</span>}
                                    {detail}
                                  </span>
                                ));
                              })()}
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${isForecasted ? 'text-purple-600 dark:text-purple-400' : 'text-finance-positive'}`}>
                          {formatCurrency(aggregatedPayout.total_amount)}
                        </p>
                        {isUpcoming && !isForecasted && <div className="flex items-center text-xs text-primary">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Upcoming
                          </div>}
                        {isForecasted && (
                          <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                            <Sparkles className="mr-1 h-3 w-3" />
                            Predicted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>;
          });
        })()}
        {(() => {
          const filteredForButton = amazonPayouts.filter(p => 
            selectedAccountId === 'all' || p.amazon_account_id === selectedAccountId
          );
          
          return filteredForButton.length > 0 && (
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setShowSettledPayouts(true)}>
                View Settlement History
              </Button>
            </div>
          );
        })()}
      </CardContent>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Amazon Seller Account</DialogTitle>
            <DialogDescription>
              Select your Amazon marketplace to connect your seller account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATVPDKIKX0DER">🇺🇸 United States</SelectItem>
                  <SelectItem value="A2EUQ1WTGCTBG2">🇨🇦 Canada</SelectItem>
                  <SelectItem value="A1AM78C64UM0Y8">🇲🇽 Mexico</SelectItem>
                  <SelectItem value="A1F83G8C2ARO7P">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="A1PA6795UKMFR9">🇩🇪 Germany</SelectItem>
                  <SelectItem value="A13V1IB3VIYZZH">🇫🇷 France</SelectItem>
                  <SelectItem value="APJ6JRA9NG5V4">🇮🇹 Italy</SelectItem>
                  <SelectItem value="A1RKKUPIHCS9HS">🇪🇸 Spain</SelectItem>
                  <SelectItem value="A1VC38T7YXB528">🇯🇵 Japan</SelectItem>
                  <SelectItem value="A39IBJ37TRP1C6">🇦🇺 Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                A new tab will open with Amazon Seller Central to authorize the connection. This is secure and read-only. Make sure pop-ups are enabled.
              </AlertDescription>
            </Alert>

            <Button onClick={handleConnectAmazon} className="w-full">
              Connect to Amazon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AmazonSettledPayouts
        open={showSettledPayouts} 
        onOpenChange={setShowSettledPayouts}
        selectedAccountId={selectedAccountId}
      />
    </Card>;
}
