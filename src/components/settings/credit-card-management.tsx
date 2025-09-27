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
  
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

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

          {/* Add Credit Card Button */}
          <div className="flex justify-center">
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