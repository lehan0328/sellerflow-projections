import React, { useState } from "react";
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
  Building
} from "lucide-react";
import { toast } from "sonner";
import { useCreditCards } from "@/hooks/useCreditCards";
import { cn } from "@/lib/utils";

export function CreditCardManagement() {
  const { 
    creditCards, 
    isLoading, 
    totalCreditLimit, 
    totalBalance, 
    totalAvailableCredit,
    addCreditCard, 
    removeCreditCard, 
    syncCreditCard 
  } = useCreditCards();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const [newCardData, setNewCardData] = useState({
    institution_name: "",
    account_name: "",
    account_type: "credit" as const,
    balance: 0,
    credit_limit: 0,
    available_credit: 0,
    currency_code: "USD",
    minimum_payment: 0,
    annual_fee: 0,
    interest_rate: 0
  });

  const handleConnectPlaid = async () => {
    setIsConnecting(true);
    try {
      // TODO: Integrate with Plaid Link for credit cards
      toast.info("Plaid integration for credit cards coming soon!");
      // This would open Plaid Link specifically for credit card accounts
    } catch (error) {
      console.error("Error connecting to Plaid:", error);
      toast.error("Failed to connect to Plaid");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddManualCard = async () => {
    if (!newCardData.institution_name || !newCardData.account_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    const success = await addCreditCard({
      ...newCardData,
      available_credit: newCardData.credit_limit - newCardData.balance,
      last_sync: new Date().toISOString(),
      is_active: true
    });

    if (success) {
      setShowAddDialog(false);
      setNewCardData({
        institution_name: "",
        account_name: "",
        account_type: "credit",
        balance: 0,
        credit_limit: 0,
        available_credit: 0,
        currency_code: "USD",
        minimum_payment: 0,
        annual_fee: 0,
        interest_rate: 0
      });
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
      await syncCreditCard(cardId);
      toast.success("Credit card synced successfully");
    } catch (error) {
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

          {/* Add Credit Card Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleConnectPlaid} 
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Connect with Plaid
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(true)}
              className="flex-1"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manually
            </Button>
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
                              <p className="text-xs text-muted-foreground">Current Balance</p>
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

                          {/* Utilization Progress Bar */}
                          <div className="mt-3">
                            <Progress 
                              value={Math.min(utilizationPercentage, 100)} 
                              className="h-2"
                            />
                          </div>

                          {/* Additional Info */}
                          {(card.minimum_payment > 0 || card.annual_fee > 0) && (
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              {card.minimum_payment > 0 && (
                                <span>Min Payment: {formatCurrency(card.minimum_payment)}</span>
                              )}
                              {card.annual_fee > 0 && (
                                <span>Annual Fee: {formatCurrency(card.annual_fee)}</span>
                              )}
                              {card.interest_rate > 0 && (
                                <span>APR: {card.interest_rate}%</span>
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

      {/* Add Manual Credit Card Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Card Manually</DialogTitle>
            <DialogDescription>
              Enter your credit card details to track spending and payments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="institution">Institution Name *</Label>
                <Input
                  id="institution"
                  value={newCardData.institution_name}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, institution_name: e.target.value }))}
                  placeholder="e.g., Chase, American Express"
                />
              </div>
              <div>
                <Label htmlFor="account-name">Account Name *</Label>
                <Input
                  id="account-name"
                  value={newCardData.account_name}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="e.g., Freedom Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={newCardData.balance}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="credit-limit">Credit Limit</Label>
                <Input
                  id="credit-limit"
                  type="number"
                  step="0.01"
                  value={newCardData.credit_limit}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="min-payment">Min Payment</Label>
                <Input
                  id="min-payment"
                  type="number"
                  step="0.01"
                  value={newCardData.minimum_payment}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, minimum_payment: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="annual-fee">Annual Fee</Label>
                <Input
                  id="annual-fee"
                  type="number"
                  step="0.01"
                  value={newCardData.annual_fee}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, annual_fee: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="interest-rate">APR (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.01"
                  value={newCardData.interest_rate}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManualCard}>
              Add Credit Card
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