import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, CreditCard, ShoppingCart, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { usePlaidLink } from "react-plaid-link";
import { supabase } from "@/integrations/supabase/client";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/upgrade-modal";
import { AddonLimitDialog } from "./addon-limit-dialog";
import { useLimitCheck } from "@/contexts/LimitCheckContext";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAccountModal = ({ open, onOpenChange }: AddAccountModalProps) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'stripe' | 'plaid' | 'amazon'>('stripe');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [addonType, setAddonType] = useState<'bank_connection' | 'amazon_connection'>('bank_connection');
  const [formData, setFormData] = useState({
    accountName: "",
    marketplace: "",
  });

  const { refetch: refetchBankAccounts } = useBankAccounts();
  const { refetch: refetchCreditCards } = useCreditCards();
  const { canAddBankConnection, canAddAmazonConnection, planLimits, currentUsage } = usePlanLimits();
  const { triggerLimitCheck } = useLimitCheck();

  // Stripe Financial Connections handler
  const handleStripeConnect = async () => {
    if (!canAddBankConnection) {
      toast.error(`Limit reached! You have ${currentUsage.bankConnections}/${planLimits.bankConnections} financial connections. Please delete a connection or purchase add-ons.`);
      setAddonType('bank_connection');
      setShowAddonDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-link-session');
      
      if (error) throw error;
      
      // Open Stripe Financial Connections in a new window
      const stripeWindow = window.open(
        `https://connect.stripe.com/setup/e/${data.clientSecret}`,
        '_blank',
        'width=500,height=600'
      );

      // Poll for completion
      const checkInterval = setInterval(async () => {
        if (stripeWindow?.closed) {
          clearInterval(checkInterval);
          
          // Exchange session for accounts
          const { data: accounts, error: exchangeError } = await supabase.functions.invoke(
            'exchange-stripe-session',
            {
              body: { sessionId: data.sessionId }
            }
          );

          if (exchangeError) {
            toast.error("Connection error: " + exchangeError.message);
          } else {
            toast.success(`Successfully connected ${accounts.accounts.length} account(s)`);
            refetchBankAccounts();
            refetchCreditCards();
            triggerLimitCheck(); // Check limits after successful connection
            onOpenChange(false);
          }
          setIsLoading(false);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error connecting with Stripe:', error);
      toast.error("Connection failed: " + error.message);
      setIsLoading(false);
    }
  };

  // Plaid link token creation
  const handlePlaidConnect = async () => {
    if (!canAddBankConnection) {
      toast.error(`Limit reached! You have ${currentUsage.bankConnections}/${planLimits.bankConnections} financial connections. Please delete a connection or purchase add-ons.`);
      setAddonType('bank_connection');
      setShowAddonDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to connect accounts");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      
      setLinkToken(data.link_token);
      setIsLoading(false);
      
      // The Plaid Link will open automatically via the usePlaidLink hook
      setTimeout(() => {
        if (ready) openPlaid();
      }, 100);
    } catch (error: any) {
      console.error('Error creating Plaid link token:', error);
      toast.error("Failed to initialize Plaid: " + error.message);
      setIsLoading(false);
    }
  };

  // Plaid Link handler
  const { open: openPlaid, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string, metadata: any) => {
      console.log('Plaid onSuccess - Selected accounts:', metadata.accounts);
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
          body: { publicToken: public_token, metadata }
        });

        if (error) throw error;

        toast.success(`Successfully connected ${metadata.accounts?.length || 0} account(s)!`);
        refetchBankAccounts();
        refetchCreditCards();
        triggerLimitCheck(); // Check limits after successful connection
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error exchanging Plaid token:', error);
        toast.error("Failed to connect account: " + error.message);
      } finally {
        setIsLoading(false);
      }
    },
    onExit: (error, metadata) => {
      console.log('Plaid onExit:', { error, metadata });
      if (error) {
        console.error('Plaid Link error:', error);
        toast.error(`Connection canceled: ${error.error_message || 'Unknown error'}`);
      }
      setIsLoading(false);
    },
  });

  // Amazon handler
  const handleAmazonConnect = () => {
    if (!canAddAmazonConnection) {
      toast.error(`Limit reached! You have ${currentUsage.amazonConnections}/${planLimits.amazonConnections} Amazon connections. Please delete a connection or purchase add-ons.`);
      setAddonType('amazon_connection');
      setShowAddonDialog(true);
      return;
    }

    if (!formData.accountName || !formData.marketplace) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("Connecting to Amazon Seller Central...");
    // This would redirect to Amazon OAuth flow in production
    setTimeout(() => {
      toast.success("Amazon account connected successfully!");
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
        </DialogHeader>

        <Tabs value={connectionMethod} onValueChange={(v) => setConnectionMethod(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stripe" disabled={!canAddBankConnection}>
              <Building2 className="h-4 w-4 mr-1" />
              Stripe
            </TabsTrigger>
            <TabsTrigger value="plaid" disabled={!canAddBankConnection}>
              <CreditCard className="h-4 w-4 mr-1" />
              Plaid
            </TabsTrigger>
            <TabsTrigger value="amazon" disabled={!canAddAmazonConnection}>
              <ShoppingCart className="h-4 w-4 mr-1" />
              Amazon
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stripe" className="space-y-4 mt-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Stripe Financial Connections</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect your bank accounts securely through Stripe. 
                      Supports 12,000+ financial institutions.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Note: Only bank accounts supported (credit card details not available via Stripe).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!canAddBankConnection && (
              <Alert className="border-warning/30 bg-warning/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You've reached your plan limit for bank connections.
                  <span className="font-semibold"> Go to Settings to purchase add-ons or upgrade.</span>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleStripeConnect}
              disabled={isLoading || !canAddBankConnection}
              className="w-full"
            >
              {isLoading ? "Connecting..." : "Connect with Stripe"}
            </Button>
          </TabsContent>

          <TabsContent value="plaid" className="space-y-4 mt-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">Plaid Integration (Legacy)</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Connect bank accounts and credit cards using Plaid's secure interface. This is the legacy method 
                      and will be phased out in favor of Stripe.
                    </p>
                    <p className="text-xs text-blue-600 mt-2 italic">
                      Note: Credit card transactions are not available (account details only).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!canAddBankConnection && (
              <Alert className="border-warning/30 bg-warning/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You've reached your plan limit for bank connections.
                  <span className="font-semibold"> Go to Settings to purchase add-ons or upgrade.</span>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handlePlaidConnect}
              disabled={!ready || isLoading || !canAddBankConnection}
              className="w-full"
              variant="outline"
            >
              {isLoading ? "Connecting..." : "Connect with Plaid"}
            </Button>
          </TabsContent>

          <TabsContent value="amazon" className="space-y-4 mt-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-orange-900">Amazon Seller Central</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Connect your Amazon Seller account to automatically sync payouts and transactions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!canAddAmazonConnection && (
              <Alert className="border-warning/30 bg-warning/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You've reached your plan limit for Amazon connections.
                  <span className="font-semibold"> Go to Settings to purchase add-ons or upgrade.</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  placeholder="e.g., Main Amazon Store"
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketplace">Marketplace *</Label>
                <Select 
                  value={formData.marketplace}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, marketplace: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select marketplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States (amazon.com)</SelectItem>
                    <SelectItem value="ca">Canada (amazon.ca)</SelectItem>
                    <SelectItem value="uk">United Kingdom (amazon.co.uk)</SelectItem>
                    <SelectItem value="de">Germany (amazon.de)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAmazonConnect}
                disabled={isLoading || !canAddAmazonConnection}
                className="w-full"
              >
                Connect Amazon Account
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature={connectionMethod === 'amazon' ? 'Amazon connections' : 'bank/credit card connections'}
        currentLimit={`${currentUsage.bankConnections}/${planLimits.bankConnections}`}
      />

      <AddonLimitDialog
        open={showAddonDialog}
        onOpenChange={setShowAddonDialog}
        addonType={addonType}
        currentUsage={addonType === 'bank_connection' ? currentUsage.bankConnections : currentUsage.amazonConnections}
        currentLimit={addonType === 'bank_connection' ? planLimits.bankConnections : planLimits.amazonConnections}
      />
    </Dialog>
  );
};
