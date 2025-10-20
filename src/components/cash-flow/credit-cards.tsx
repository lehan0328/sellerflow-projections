import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Calendar, AlertTriangle, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { toast } from "sonner";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CreditCardFormData {
  nickname: string;
  annual_fee: number;
  cash_back: number;
  priority: number;
  forecast_next_month: boolean;
  pay_minimum: boolean;
}

export function CreditCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { creditCards, isLoading, totalCreditLimit, totalBalance, totalAvailableCredit, addCreditCard, updateCreditCard, removeCreditCard } = useCreditCards();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [formData, setFormData] = useState<CreditCardFormData>({
    nickname: '',
    annual_fee: 0,
    cash_back: 0,
    priority: 3,
    forecast_next_month: false,
    pay_minimum: false,
  });
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const config = {
    token: linkToken,
    onSuccess: async (publicToken: string, metadata: any) => {
      try {
        const { error } = await supabase.functions.invoke('exchange-plaid-token', {
          body: { publicToken, metadata }
        });
        
        if (error) throw error;
        
        toast.success("Credit card connected successfully!");
      } catch (error: any) {
        console.error('Error exchanging token:', error);
        toast.error(error.message || "Failed to connect card");
      }
    },
    onExit: (err: any) => {
      if (err) {
        console.error('Plaid Link error:', err);
        toast.error("Failed to connect card");
      }
      setLinkToken(null);
      setIsConnecting(false);
    }
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleConnectPlaid = async () => {
    if (!user) {
      toast.error("Please log in to connect a credit card");
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId: user.id }
      });

      if (error) throw error;
      
      setLinkToken(data.link_token);
    } catch (error: any) {
      console.error('Error creating link token:', error);
      toast.error(error.message || "Failed to initialize card connection");
      setIsConnecting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getUtilizationPercentage = (balance: number, limit: number) => {
    return Math.min((balance / limit) * 100, 100);
  };

  const getUtilizationVariant = (percentage: number) => {
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "default";
  };

  const resetForm = () => {
    setFormData({
      nickname: '',
      annual_fee: 0,
      cash_back: 0,
      priority: 3,
      forecast_next_month: false,
      pay_minimum: false,
    });
  };

  const handleAddCard = async () => {
    // Redirect to manage credit cards page for Plaid integration
    navigate('/manage-credit-cards');
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setFormData({
      nickname: card.nickname || '',
      annual_fee: card.annual_fee || 0,
      cash_back: card.cash_back || 0,
      priority: card.priority || 3,
      forecast_next_month: card.forecast_next_month || false,
      pay_minimum: card.pay_minimum || false,
    });
    setShowEditDialog(true);
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    const success = await updateCreditCard(editingCard.id, formData);

    if (success) {
      setShowEditDialog(false);
      setEditingCard(null);
      resetForm();
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (confirm('Are you sure you want to remove this credit card?')) {
      await removeCreditCard(cardId);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Credit Cards</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading credit cards...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Credit Cards</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings', { state: { activeSection: 'credit-cards' } })}
              className="ml-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Total Available: <span className="font-semibold text-finance-positive">{formatCurrency(totalAvailableCredit)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {creditCards.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No credit cards added yet</p>
            <Button onClick={handleConnectPlaid} disabled={isConnecting}>
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Your First Card"}
            </Button>
          </div>
        ) : (
          creditCards.map((card) => {
            const utilizationPercentage = getUtilizationPercentage(card.balance, card.credit_limit);
            const isOverLimit = card.available_credit < 0;
            
            return (
              <div
                key={card.id}
                className="rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-sm leading-tight">
                          {card.nickname || `${card.institution_name} - ${card.account_name}`}
                        </h4>
                        {card.masked_account_number && (
                          <Badge variant="outline" className="text-xs">
                            *{card.masked_account_number.slice(-4)}
                          </Badge>
                        )}
                        <Badge 
                          variant={card.priority === 1 ? "default" : card.priority === 2 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          Priority {card.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {card.payment_due_date ? (
                          (() => {
                            const dueDate = new Date(card.payment_due_date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isPast = dueDate < today;
                            
                            if (isPast) {
                              return (
                                <button
                                  onClick={() => handleEditCard(card)}
                                  className="flex items-center text-destructive hover:underline font-medium"
                                >
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  Update due date (passed)
                                </button>
                              );
                            }
                            
                            return (
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-3 w-3" />
                                Due: {dueDate.toLocaleDateString()}
                              </span>
                            );
                          })()
                        ) : (
                          <button
                            onClick={() => handleEditCard(card)}
                            className="flex items-center text-primary hover:underline"
                          >
                            <Calendar className="mr-1 h-3 w-3" />
                            Set due date
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOverLimit && (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCard(card)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Utilization</span>
                      <span className="text-sm text-muted-foreground">
                        {utilizationPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={utilizationPercentage} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Statement Balance</p>
                      <p className="font-semibold text-finance-negative">
                        {formatCurrency(card.statement_balance || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Balance</p>
                      <p className="font-semibold text-finance-negative">
                        {formatCurrency(card.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Payment</p>
                      <p className="font-semibold text-finance-negative">
                        {formatCurrency(card.minimum_payment || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Limit</p>
                      <p className="font-semibold">
                        {formatCurrency(card.credit_limit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className={`font-semibold ${
                        card.available_credit < 0 ? 'text-finance-negative' : 'text-finance-positive'
                      }`}>
                        {formatCurrency(card.available_credit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Credit Card</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editingCard && (
                <div className="text-sm text-muted-foreground mb-2">
                  <p><strong>Account:</strong> {editingCard.institution_name} - {editingCard.account_name}</p>
                  <p><strong>Balance:</strong> {formatCurrency(editingCard.balance)} / {formatCurrency(editingCard.credit_limit)}</p>
                </div>
              )}
              <div>
                <Label htmlFor="edit_nickname">Nickname (optional)</Label>
                <Input
                  id="edit_nickname"
                  placeholder={editingCard ? `${editingCard.institution_name} - ${editingCard.account_name}` : ''}
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Give this card a custom name for easier identification
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Payment</Label>
                  <div className="flex items-center h-10 px-3 py-2 text-sm border border-input rounded-md bg-muted">
                    {editingCard?.minimum_payment 
                      ? formatCurrency(editingCard.minimum_payment)
                      : 'Not set'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically imported from bank (read-only)
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit_cash_back">Cash Back (%)</Label>
                  <Input
                    id="edit_cash_back"
                    type="number"
                    step="0.01"
                    value={formData.cash_back}
                    onChange={(e) => setFormData({...formData, cash_back: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Due Date</Label>
                  <div className="flex items-center h-10 px-3 py-2 text-sm border border-input rounded-md bg-muted">
                    {editingCard?.payment_due_date 
                      ? new Date(editingCard.payment_due_date).toLocaleDateString()
                      : 'Not set'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically imported from bank (read-only)
                  </p>
                </div>
                <div>
                  <Label>Statement Close Date</Label>
                  <div className="flex items-center h-10 px-3 py-2 text-sm border border-input rounded-md bg-muted">
                    {editingCard?.statement_close_date 
                      ? new Date(editingCard.statement_close_date).toLocaleDateString()
                      : 'Not set'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically imported from bank (read-only)
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="edit_priority">Priority (1=Highest, 5=Lowest)</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(value) => setFormData({...formData, priority: parseInt(value)})}
                >
                  <SelectTrigger id="edit_priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Highest Priority</SelectItem>
                    <SelectItem value="2">2 - High Priority</SelectItem>
                    <SelectItem value="3">3 - Medium Priority</SelectItem>
                    <SelectItem value="4">4 - Low Priority</SelectItem>
                    <SelectItem value="5">5 - Lowest Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 border border-destructive/50 bg-destructive/5 rounded-md">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Label htmlFor="edit_pay_minimum" className="text-destructive font-semibold">
                      Pay Minimum Only (Emergency Use)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Not recommended - You will pay interest charges. Use only for emergencies.
                  </p>
                </div>
                <Switch
                  id="edit_pay_minimum"
                  checked={formData.pay_minimum}
                  onCheckedChange={(checked) => setFormData({...formData, pay_minimum: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit_forecast_next_month">Forecast Next Month</Label>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Project next month's payment based on current spending pattern
                  </p>
                </div>
                <Switch
                  id="edit_forecast_next_month"
                  checked={formData.forecast_next_month}
                  onCheckedChange={(checked) => setFormData({...formData, forecast_next_month: checked})}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCard}>
                  Update Card
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Export the credit card due date events generator
export const getCreditCardDueDates = () => {
  // This function is called from Dashboard and needs the credit cards data
  // It's implemented in useCreditCards hook to be used directly in Dashboard
  return [];
};