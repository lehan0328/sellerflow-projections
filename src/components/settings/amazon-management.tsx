import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
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
  const { amazonPayouts, totalUpcoming } = useAmazonPayouts();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState('ATVPDKIKX0DER'); // Default to US

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
      
      toast.info('Opening Amazon Seller Central in a new tab...');
      console.log('Step 4: Opening Amazon in new tab...');
      
      // CRITICAL: Open in new tab to avoid iframe blocking (X-Frame-Options: DENY)
      // Use window.open with noopener for security
      const newWindow = window.open(authUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups and try again.');
        console.error('Pop-up was blocked by browser');
      } else {
        toast.success('Amazon authorization opened in new tab. Please complete the process there.');
      }
    } catch (error) {
      console.error('=== ERROR IN AMAZON CONNECTION ===', error);
      toast.error(`Failed to initiate Amazon connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setIsSyncing(accountId);
    try {
      await syncAmazonAccount(accountId);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (confirm('Are you sure you want to remove this Amazon account? This will also remove all associated transaction data.')) {
      await removeAmazonAccount(accountId);
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
                        <div className="bg-white/50 p-2 rounded border border-blue-200">
                          <p className="text-xs font-medium text-foreground mb-1">Required Redirect URL in Amazon:</p>
                          <code className="text-xs text-blue-600 break-all">{window.location.origin}/amazon-oauth-callback</code>
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
                          <div className="bg-white/50 p-2 rounded border border-blue-200">
                            <p className="text-xs font-medium text-foreground mb-1">Required Redirect URL in Amazon:</p>
                            <code className="text-xs text-blue-600 break-all">{window.location.origin}/amazon-oauth-callback</code>
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
    </div>
  );
}