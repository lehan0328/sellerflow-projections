import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, TrendingUp, Calendar, Settings, RefreshCw, Sparkles, Clock, Plus, Loader2 } from "lucide-react";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useState } from "react";
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

export function AmazonPayouts() {
  const navigate = useNavigate();
  const {
    amazonPayouts,
    isLoading,
    totalUpcoming,
    refetch
  } = useAmazonPayouts();
  const {
    amazonAccounts,
    syncAmazonAccount
  } = useAmazonAccounts();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showForecasts, setShowForecasts] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState("ATVPDKIKX0DER");
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
    for (const account of amazonAccounts) {
      setIsSyncing(account.id);
      await syncAmazonAccount(account.id);
    }
    setIsSyncing(null);
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
            
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
          <div className="flex items-center space-x-4">
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
                <Button variant="outline" size="sm" onClick={handleSyncAllAccounts} disabled={isSyncing !== null}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/amazon-transactions-test")}
                >
                  Test Data
                </Button>
              </>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {account.sync_message || 'Starting sync...'}
                    </p>
                    <div className="mt-2 bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${account.sync_progress || 0}%` }}
                      />
                    </div>
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
                  ? Math.floor((Date.now() - new Date(account.last_sync).getTime()) / (1000 * 60 * 60))
                  : null;
                const hasRecentSync = hoursSinceSync !== null && hoursSinceSync < 24;
                const showWarning = !account.initial_sync_complete && hoursSinceSync !== null && hoursSinceSync > 24;
                
                return (
                  <div key={account.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2 flex-1">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{account.account_name}</span>
                          <span className="text-muted-foreground text-xs">({account.marketplace_name})</span>
                        </div>
                        {showWarning && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            Syncing for {hoursSinceSync}h - Amazon may have no recent activity
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {account.initial_sync_complete ? (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                          ✓ Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                          Syncing...
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {account.transaction_count || 0} txns
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {amazonAccounts.some(a => !a.initial_sync_complete) && (
              <Alert className="mt-3 bg-blue-500/5 border-blue-500/20">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-muted-foreground">
                  Initial sync can take up to 24 hours. If no transactions appear, your Amazon account may have no recent sales activity.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {amazonPayouts.length === 0 ? <div className="space-y-4">
            {amazonAccounts.length > 0 && <Alert className="border-blue-500/30 bg-blue-500/5">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Amazon data sync can take up to 24 hours after connecting your account. Please check back later.
                </AlertDescription>
              </Alert>}
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Amazon payouts found</h3>
              <p className="text-muted-foreground mb-4">
                {amazonAccounts.length === 0 ? "Connect your Amazon seller account to see payouts" : "Sync your Amazon accounts to load payout data"}
              </p>
              <Button onClick={() => amazonAccounts.length === 0 ? setShowConnectDialog(true) : navigate('/settings')}>
                {amazonAccounts.length === 0 ? <Plus className="h-4 w-4 mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
                {amazonAccounts.length === 0 ? "Connect Amazon Account" : "Manage Amazon Settings"}
              </Button>
            </div>
          </div> : (() => {
          // Group payouts by date and aggregate amounts, exclude past dates
          const filteredPayouts = amazonPayouts.filter(payout => {
            const daysUntil = getDaysUntil(payout.payout_date);
            return daysUntil >= 0 && (showForecasts ? true : payout.status !== 'forecasted');
          });
          const payoutsByDate = filteredPayouts.reduce((acc, payout) => {
            const dateKey = payout.payout_date;
            if (!acc[dateKey]) {
              acc[dateKey] = {
                ...payout,
                total_amount: 0,
                transaction_count: 0,
                payouts: []
              };
            }
            acc[dateKey].total_amount += payout.total_amount;
            acc[dateKey].transaction_count += payout.transaction_count;
            acc[dateKey].payouts.push(payout);
            return acc;
          }, {} as Record<string, any>);
          
          return Object.values(payoutsByDate).map(aggregatedPayout => {
            const daysUntil = getDaysUntil(aggregatedPayout.payout_date);
            const isUpcoming = daysUntil <= 7;
            const isForecasted = aggregatedPayout.status === 'forecasted';
            
            return <div key={aggregatedPayout.payout_date} className={`rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card ${isUpcoming ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
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
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {formatDate(aggregatedPayout.payout_date)}
                          </span>
                          <span className={`font-medium ${daysUntil === 0 ? 'text-finance-positive' : daysUntil <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {daysUntil === 0 ? 'Today' : `in ${daysUntil} days`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {aggregatedPayout.transaction_count} transactions
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-finance-positive">
                          {formatCurrency(aggregatedPayout.total_amount)}
                        </p>
                        {isUpcoming && <div className="flex items-center text-xs text-primary">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Upcoming
                          </div>}
                      </div>
                    </div>
                  </div>;
          });
        })()}
        {amazonPayouts.length > 0 && <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
              View Amazon Settings & Full Schedule
            </Button>
          </div>}
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
    </Card>;
}
