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

const marketplaces = [
  { id: "ATVPDKIKX0DER", name: "United States", code: "US" },
  { id: "A2Q3Y263D00KWC", name: "Brazil", code: "BR" },
  { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA" },
  { id: "A1AM78C64UM0Y8", name: "Mexico", code: "MX" },
  { id: "A1PA6795UKMFR9", name: "Germany", code: "DE" },
  { id: "A1RKKUPIHCS9HS", name: "Spain", code: "ES" },
  { id: "A13V1IB3VIYZZH", name: "France", code: "FR" },
  { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT" },
  { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK" },
  { id: "A21TJRUUN4KGV", name: "India", code: "IN" },
  { id: "A19VAU5U5O7RUS", name: "Singapore", code: "SG" },
  { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU" },
  { id: "A1VC38T7YXB528", name: "Japan", code: "JP" },
];

export function AmazonManagement() {
  const { amazonAccounts, isLoading, addAmazonAccount, removeAmazonAccount, syncAmazonAccount } = useAmazonAccounts();
  const { amazonPayouts, totalUpcoming } = useAmazonPayouts();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState<AmazonAccountFormData>({
    seller_id: '',
    marketplace_id: '',
    marketplace_name: '',
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

  const resetForm = () => {
    setFormData({
      seller_id: '',
      marketplace_id: '',
      marketplace_name: '',
      account_name: '',
      refresh_token: '',
      client_id: '',
      client_secret: '',
      payout_frequency: 'bi-weekly',
    });
  };

  const handleAddAccount = async () => {
    if (!formData.seller_id || !formData.marketplace_id || !formData.account_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    const success = await addAmazonAccount(formData);
    if (success) {
      setShowAddDialog(false);
      resetForm();
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

  const handleMarketplaceChange = (marketplaceId: string) => {
    const marketplace = marketplaces.find(m => m.id === marketplaceId);
    setFormData({
      ...formData,
      marketplace_id: marketplaceId,
      marketplace_name: marketplace ? marketplace.name : '',
    });
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
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Connect Amazon Seller Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="seller_id">Seller ID *</Label>
                      <Input
                        id="seller_id"
                        value={formData.seller_id}
                        onChange={(e) => setFormData({...formData, seller_id: e.target.value})}
                        placeholder="A1BCDEFG2HIJKLM"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_name">Account Name *</Label>
                      <Input
                        id="account_name"
                        value={formData.account_name}
                        onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                        placeholder="My Amazon Store"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="marketplace">Marketplace *</Label>
                    <Select value={formData.marketplace_id} onValueChange={handleMarketplaceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select marketplace" />
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

                  <div>
                    <Label htmlFor="payout_frequency">Payout Schedule *</Label>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50 mt-2">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`text-sm font-medium transition-colors ${
                          formData.payout_frequency === 'bi-weekly' ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          Bi-Weekly (Every 14 days)
                        </span>
                        <Switch
                          id="payout_frequency"
                          checked={formData.payout_frequency === 'daily'}
                          onCheckedChange={(checked) => 
                            setFormData({
                              ...formData, 
                              payout_frequency: checked ? 'daily' : 'bi-weekly'
                            })
                          }
                        />
                        <span className={`text-sm font-medium transition-colors ${
                          formData.payout_frequency === 'daily' ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          Daily
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Toggle to select how often Amazon pays out to your account
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">SP-API Credentials</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client_id">Client ID</Label>
                        <Input
                          id="client_id"
                          type="password"
                          value={formData.client_id}
                          onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                          placeholder="Your SP-API Client ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client_secret">Client Secret</Label>
                        <Input
                          id="client_secret"
                          type="password"
                          value={formData.client_secret}
                          onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
                          placeholder="Your SP-API Client Secret"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="refresh_token">Refresh Token</Label>
                      <Textarea
                        id="refresh_token"
                        value={formData.refresh_token}
                        onChange={(e) => setFormData({...formData, refresh_token: e.target.value})}
                        placeholder="Your SP-API Refresh Token"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>To get your SP-API credentials:</strong>
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to Amazon Seller Central → Apps & Services → Develop apps</li>
                      <li>Create a new app or use existing SP-API credentials</li>
                      <li>Generate refresh token through Authorization workflow</li>
                      <li>All credentials are encrypted and stored securely</li>
                    </ol>
                    <div className="flex items-center mt-2">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <a 
                        href="https://developer-docs.amazon.com/sp-api/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        Amazon SP-API Documentation
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAccount}>
                      Connect Account
                    </Button>
                  </div>
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
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Account
              </Button>
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
                  <div className="space-y-1">
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
                    <p className="text-xs text-muted-foreground">
                      Payout Schedule: {account.payout_frequency === 'daily' ? 'Daily' : 'Bi-Weekly (Every 14 days)'}
                    </p>
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