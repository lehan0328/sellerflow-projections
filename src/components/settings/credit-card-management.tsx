import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  DollarSign, 
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Building,
  Info,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { toast } from "sonner";
import { useCreditCards } from "@/hooks/useCreditCards";
import { cn } from "@/lib/utils";
import { usePlaidLink } from "react-plaid-link";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

export function CreditCardManagement() {
  const { theme, setTheme } = useTheme();
  const { 
    creditCards, 
    isLoading, 
    totalCreditLimit, 
    totalBalance, 
    totalAvailableCredit,
    addCreditCard, 
    removeCreditCard, 
    syncCreditCard,
    updateCreditCard
  } = useCreditCards();
  
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [newCardIds, setNewCardIds] = useState<string[]>([]);
  const [enableForecast, setEnableForecast] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<string>("system");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // Plaid Link configuration for credit cards
  const config = {
    token: linkToken,
    onSuccess: async (public_token: string, metadata: any) => {
      try {
        console.log("Plaid Link success:", metadata);
        
        // Exchange the public token for an access token via edge function
        const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
          body: { publicToken: public_token, metadata }
        });

        if (error) throw error;

        toast.success(data.message || "Credit card connected successfully!");
        setIsConnecting(false);
        setLinkToken(null);
        
        // Wait for cards to be refetched and then show onboarding
        setTimeout(() => {
          // Get cards that were just created (within last 10 seconds)
          const justCreated = creditCards.filter(card => {
            const createdTime = new Date(card.created_at).getTime();
            const now = Date.now();
            return (now - createdTime) < 10000; // 10 seconds
          });
          
          if (justCreated.length > 0) {
            setNewCardIds(justCreated.map(c => c.id));
            setShowOnboardingDialog(true);
          }
        }, 2000); // Wait 2 seconds for refetch
      } catch (error) {
        console.error("Error exchanging token:", error);
        toast.error("Failed to connect credit card");
        setIsConnecting(false);
      }
    },
    onExit: (err: any, metadata: any) => {
      console.log("Plaid Link exit:", { err, metadata });
      if (err) {
        toast.error("Failed to connect credit card");
      }
      setIsConnecting(false);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Open Plaid Link when token is available
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleConnectPlaid = async () => {
    try {
      setIsConnecting(true);
      
      // Get link token from edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to connect credit cards");
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
      toast.error("Failed to initialize credit card connection");
      setIsConnecting(false);
    }
  };


  const handleRemoveCard = async () => {
    if (!selectedCard) return;

    const success = await removeCreditCard(selectedCard);
    if (success) {
      setShowRemoveDialog(false);
      setSelectedCard(null);
    }
  };

  const handleSyncCard = async (cardId: string) => {
    setIsSyncing(cardId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-plaid-accounts', {
        body: { accountId: cardId, accountType: 'credit_card' }
      });

      if (error) throw error;

      toast.success(data.message || "Credit card synced successfully");
    } catch (error) {
      console.error("Error syncing card:", error);
      toast.error("Failed to sync credit card");
    } finally {
      setIsSyncing(null);
    }
  };

  const getUtilizationPercentage = (balance: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.round((balance / limit) * 100);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Credit Card Management</span>
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
            <CreditCard className="h-5 w-5" />
            <span>Credit Card Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Credit Limit</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalCreditLimit)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Total Balance</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalBalance)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Available Credit</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAvailableCredit)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add Credit Card Button */}
          <div className="flex flex-col items-center gap-2">
            <Button 
              onClick={handleConnectPlaid} 
              disabled={isConnecting}
              className="w-full max-w-xs"
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Connect with Plaid
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Plaid automatically syncs statement balance, minimum payment, and due dates from your credit card
            </p>
          </div>

          <Separator />

          {/* Credit Cards List */}
          {creditCards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Credit Cards Connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your credit cards to track spending and manage payments
              </p>
              <Button onClick={handleConnectPlaid}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Credit Card
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {creditCards.map((card) => {
                const utilizationPercentage = getUtilizationPercentage(card.balance, card.credit_limit);
                const isOverLimit = card.available_credit < 0;
                
                return (
                  <Card key={card.id} className={cn(
                    "transition-all hover:shadow-md",
                    isOverLimit && "border-red-200 bg-red-50/50"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-3">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold">{card.institution_name}</h3>
                              <p className="text-sm text-muted-foreground">{card.account_name}</p>
                            </div>
                            {isOverLimit && (
                              <Badge variant="destructive" className="ml-2">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Over Limit
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Statement Balance</p>
                              <p className="font-semibold">{formatCurrency(card.balance)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Credit Limit</p>
                              <p className="font-semibold">{formatCurrency(card.credit_limit)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Available Credit</p>
                              <p className={cn(
                                "font-semibold",
                                card.available_credit < 0 ? "text-red-600" : "text-green-600"
                              )}>
                                {formatCurrency(card.available_credit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Utilization</p>
                              <p className={cn(
                                "font-semibold",
                                getUtilizationColor(utilizationPercentage)
                              )}>
                                {utilizationPercentage}%
                              </p>
                            </div>
                          </div>
                          
                          {/* Payment Due Date & Statement Close Date */}
                          {(card.payment_due_date || card.statement_close_date) && (
                            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                              {card.payment_due_date && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Payment Due Date</p>
                                  <p className="font-semibold text-orange-600">
                                    {new Date(card.payment_due_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              )}
                              {card.statement_close_date && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Statement Close Date</p>
                                  <p className="font-semibold">
                                    {new Date(card.statement_close_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Utilization Progress Bar */}
                          <div className="mt-3">
                            <Progress 
                              value={Math.min(utilizationPercentage, 100)} 
                              className="h-2"
                            />
                          </div>

                          {/* Additional Info */}
                          {(card.minimum_payment > 0 || card.annual_fee > 0 || card.payment_due_date || card.statement_close_date) && (
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                              {card.minimum_payment > 0 && (
                                <span>Min Payment: {formatCurrency(card.minimum_payment)}</span>
                              )}
                              {card.payment_due_date && (
                                <span className="text-orange-600 font-medium">
                                  Due: {new Date(card.payment_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {card.statement_close_date && (
                                <span>
                                  Statement: {new Date(card.statement_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {card.annual_fee > 0 && (
                                <span>Annual Fee: {formatCurrency(card.annual_fee)}</span>
                              )}
                              {card.cash_back > 0 && (
                                <span>Cash Back: {card.cash_back}%</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncCard(card.id)}
                            disabled={isSyncing === card.id}
                          >
                            <RefreshCw className={cn(
                              "h-4 w-4",
                              isSyncing === card.id && "animate-spin"
                            )} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCard(card.id);
                              setShowRemoveDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Dialog for New Credit Cards */}
      <Dialog open={showOnboardingDialog} onOpenChange={setShowOnboardingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Credit Card Forecast Setup
            </DialogTitle>
            <DialogDescription>
              We recommend enabling payment forecasting to help you plan ahead
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">Enable Next Month Forecast</p>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically project next month's payment based on your current spending pattern
                </p>
              </div>
              <Switch
                checked={enableForecast}
                onCheckedChange={setEnableForecast}
              />
            </div>
            
            <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-md">
              <p className="font-medium mb-1">How it works:</p>
              <p>Formula: Credit Limit - Available Credit - Statement Balance</p>
              <p className="mt-2">This shows you what your next payment might be if you continue spending at the same rate.</p>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="font-medium text-sm">Dashboard Appearance</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={selectedTheme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTheme('light')}
                  className="flex flex-col items-center gap-2 h-auto py-3"
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedTheme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTheme('dark')}
                  className="flex flex-col items-center gap-2 h-auto py-3"
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedTheme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTheme('system')}
                  className="flex flex-col items-center gap-2 h-auto py-3"
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Choose how your dashboard looks. You can change this later in Settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={async () => {
                setShowOnboardingDialog(false);
                setEnableForecast(true);
              }}
            >
              Skip for Now
            </Button>
            <Button onClick={async () => {
              try {
                // Apply theme selection
                setTheme(selectedTheme);
                
                // Update all newly connected cards with forecast setting
                for (const cardId of newCardIds) {
                  await updateCreditCard(cardId, { forecast_next_month: enableForecast });
                }
                
                toast.success(
                  enableForecast 
                    ? "Forecast enabled and theme applied" 
                    : "Settings saved"
                );
                setShowOnboardingDialog(false);
                setEnableForecast(true);
                setSelectedTheme("system");
              } catch (error) {
                console.error("Error updating settings:", error);
                toast.error("Failed to update settings");
              }
            }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Remove Credit Card Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Credit Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this credit card? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveCard}>
              Remove Credit Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}