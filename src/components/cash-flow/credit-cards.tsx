import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, AlertTriangle, Settings, Plus, Edit, Trash2, DollarSign, Search, ShoppingCart, AlertCircle, Check } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { toast } from "sonner";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCardPriorityDialog } from "./credit-card-priority-dialog";
import { PlaidAccountConfirmationDialog } from "./plaid-account-confirmation-dialog";
import { ManualCreditCardDialog } from "./manual-credit-card-dialog";

interface CreditCardFormData {
  nickname: string;
  annual_fee: number;
  cash_back: number;
  priority: number;
  forecast_next_month: boolean;
  payment_due_date: string;
  statement_balance: number;
  credit_limit_override: number | null;
}

interface CreditCardsProps {
  creditCardOpportunities?: Array<{ date: string; balance: number; available_date?: string }>;
}

export function CreditCards({ creditCardOpportunities = [] }: CreditCardsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { creditCards, isLoading, totalCreditLimit, totalBalance, totalAvailableCredit, addCreditCard, updateCreditCard, removeCreditCard } = useCreditCards();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [pendingOrdersForCard, setPendingOrdersForCard] = useState<any[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [newCardForPriority, setNewCardForPriority] = useState<{ id: string; name: string } | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [pendingPlaidData, setPendingPlaidData] = useState<{ publicToken: string; metadata: any } | null>(null);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualEditingCard, setManualEditingCard] = useState<any>(null);
  const [showSetDueDateDialog, setShowSetDueDateDialog] = useState(false);
  const [cardForDueDate, setCardForDueDate] = useState<any>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [showSearchOpportunities, setShowSearchOpportunities] = useState(false);
  const [searchType, setSearchType] = useState<'amount' | 'date'>('amount');
  const [searchAmount, setSearchAmount] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [formData, setFormData] = useState<CreditCardFormData>({
    nickname: '',
    annual_fee: 0,
    cash_back: 0,
    priority: 3,
    forecast_next_month: false,
    payment_due_date: '',
    statement_balance: 0,
    credit_limit_override: null,
  });

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
      payment_due_date: '',
      statement_balance: 0,
      credit_limit_override: null,
    });
  };

  const handleSavePriority = async (cardId: string, priority: number) => {
    await updateCreditCard(cardId, { priority });
    toast.success("Card priority updated!");
  };

  const config = {
    token: linkToken,
    onSuccess: async (publicToken: string, metadata: any) => {
      // Don't call exchange-plaid-token yet - just store the data and show confirmation dialog
      // Accounts won't be saved to database until user confirms
      setPendingPlaidData({ publicToken, metadata });
      setShowConfirmationDialog(true);
    },
    onExit: (err: any) => {
      if (err) {
        console.error('Plaid Link error:', err);
        toast.error("Failed to connect credit card");
      }
      setLinkToken(null);
      setIsConnecting(false);
      setPendingPlaidData(null);
      setShowConfirmationDialog(false);
    }
  };

  const handleConfirmAccounts = async (selectedAccountIds: string[], priorities: Record<string, number>) => {
    if (!pendingPlaidData) return;
    
    const { publicToken, metadata } = pendingPlaidData;
    
    try {
      // NOW call exchange-plaid-token with only the selected accounts
      // Only these will be stored in the database
      const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
        body: { 
          publicToken, 
          metadata: {
            ...metadata,
            accounts: metadata.accounts.filter((acc: any) => selectedAccountIds.includes(acc.account_id))
          },
          selectedAccountIds,
          priorities
        }
      });
      
      if (error) throw error;
      
      toast.success(`${selectedAccountIds.length} account${selectedAccountIds.length !== 1 ? 's' : ''} connected successfully!`);
      
      // Refresh the page to show new accounts
      window.location.reload();
    } catch (error: any) {
      console.error('Error exchanging token:', error);
      toast.error(error.message || "Failed to connect accounts");
    } finally {
      setPendingPlaidData(null);
    }
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleAddCard = async () => {
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
      toast.error(error.message || "Failed to initialize credit card connection");
      setIsConnecting(false);
    }
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setFormData({
      nickname: card.nickname || '',
      annual_fee: card.annual_fee || 0,
      cash_back: card.cash_back || 0,
      priority: card.priority || 3,
      forecast_next_month: card.forecast_next_month || false,
      payment_due_date: card.payment_due_date || '',
      statement_balance: card.statement_balance || 0,
      credit_limit_override: card.credit_limit_override || null,
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

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    
    const result = await removeCreditCard(cardToDelete);
    
    // Check if deletion was blocked due to pending orders
    if (result && typeof result === 'object' && 'blocked' in result && result.blocked) {
      setPendingOrdersForCard(result.orders || []);
      // Keep dialog open to show the pending orders
      return;
    }
    
    setDeleteDialogOpen(false);
    setCardToDelete(null);
    setPendingOrdersForCard([]);
  };

  const handleSetDueDate = async () => {
    if (!cardForDueDate || !newDueDate) return;

    const success = await updateCreditCard(cardForDueDate.id, {
      payment_due_date: newDueDate
    });

    if (success) {
      toast.success("Payment due date set successfully");
      setShowSetDueDateDialog(false);
      setCardForDueDate(null);
      setNewDueDate('');
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
              onClick={() => navigate('/dashboard?view=settings&section=credit-cards')}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSearchOpportunities(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search Opportunities
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setManualEditingCard(null);
                setShowManualDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manual
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleAddCard}
              disabled={isConnecting}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Add Card"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {creditCards.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No credit cards added yet</p>
            <Button onClick={() => navigate('/dashboard?view=settings&section=credit-cards')}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Card
            </Button>
          </div>
        ) : (
          creditCards.map((card) => {
            const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
            const effectiveAvailableCredit = effectiveCreditLimit - card.balance;
            const utilizationPercentage = getUtilizationPercentage(card.balance, effectiveCreditLimit);
            const isOverLimit = effectiveAvailableCredit < 0;
            
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
                        {card.priority ? (
                          <Badge 
                            variant={card.priority === 1 ? "default" : card.priority === 2 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            Priority {card.priority}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setNewCardForPriority({ id: card.id, name: card.nickname || `${card.institution_name} - ${card.account_name}` });
                              setShowPriorityDialog(true);
                            }}
                          >
                            Set Priority
                          </Button>
                        )}
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
                            onClick={() => {
                              setCardForDueDate(card);
                              setNewDueDate('');
                              setShowSetDueDateDialog(true);
                            }}
                            className="flex items-center text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <Calendar className="mr-1 h-3 w-3" />
                            Set payment due date
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
                        onClick={() => {
                          setCardToDelete(card.id);
                          setDeleteDialogOpen(true);
                        }}
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
                      <div className="flex items-center gap-1">
                        <p className="font-semibold">
                          {formatCurrency(card.credit_limit_override || card.credit_limit)}
                        </p>
                        {card.credit_limit_override && (
                          <span className="text-xs text-blue-600">*</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className={`font-semibold ${
                        ((card.credit_limit_override || card.credit_limit) - card.balance) < 0 ? 'text-finance-negative' : 'text-finance-positive'
                      }`}>
                        {formatCurrency((card.credit_limit_override || card.credit_limit) - card.balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Credit Card</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingOrdersForCard.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-destructive font-semibold">
                      Cannot delete this card: {pendingOrdersForCard.length} pending purchase order{pendingOrdersForCard.length !== 1 ? 's' : ''} are linked to it.
                    </p>
                    <div className="bg-muted p-3 rounded-md space-y-2 max-h-48 overflow-y-auto">
                      {pendingOrdersForCard.map((order: any) => (
                        <div key={order.id} className="text-sm border-b border-border pb-2 last:border-0">
                          <p className="font-medium">{order.description}</p>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Due: {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'No date'}</span>
                            <span className="font-semibold">{formatCurrency(order.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm">
                      Please complete or reassign these orders to another payment method before deleting this card.
                    </p>
                  </div>
                ) : (
                  "Are you sure you want to delete this credit card? This will delete all associated transactions and update available cash, which will affect your forecasting. This action cannot be undone."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {pendingOrdersForCard.length > 0 ? (
                <AlertDialogCancel onClick={() => {
                  setDeleteDialogOpen(false);
                  setCardToDelete(null);
                  setPendingOrdersForCard([]);
                }}>
                  Close
                </AlertDialogCancel>
              ) : (
                <>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              <div>
                <Label htmlFor="edit_payment_due_date">Payment Due Date</Label>
                <Input
                  id="edit_payment_due_date"
                  type="date"
                  value={formData.payment_due_date}
                  onChange={(e) => setFormData({...formData, payment_due_date: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When is your payment due?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_statement_balance">Statement Balance</Label>
                  <Input
                    id="edit_statement_balance"
                    type="number"
                    step="0.01"
                    value={formData.statement_balance}
                    onChange={(e) => setFormData({...formData, statement_balance: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your current statement balance
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit_credit_limit_override">Extended Credit Limit</Label>
                  <Input
                    id="edit_credit_limit_override"
                    type="number"
                    placeholder={editingCard ? `Default: ${formatCurrency(editingCard.credit_limit)}` : ''}
                    value={formData.credit_limit_override || ''}
                    onChange={(e) => setFormData({...formData, credit_limit_override: e.target.value ? parseFloat(e.target.value) : null})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Extended purchasing power beyond standard limit
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

        {/* Priority Dialog for Newly Added Cards */}
        {newCardForPriority && (
          <CreditCardPriorityDialog
            open={showPriorityDialog}
            onOpenChange={setShowPriorityDialog}
            cardName={newCardForPriority.name}
            cardId={newCardForPriority.id}
            onSave={handleSavePriority}
          />
        )}

        {/* Account Confirmation Dialog */}
        {pendingPlaidData && (
          <PlaidAccountConfirmationDialog
            open={showConfirmationDialog}
            onOpenChange={(open) => {
              setShowConfirmationDialog(open);
              if (!open) {
                // User closed dialog without confirming - clean up
                setPendingPlaidData(null);
                setIsConnecting(false);
              }
            }}
            accounts={pendingPlaidData.metadata.accounts}
            institutionName={pendingPlaidData.metadata.institution.name}
            onConfirm={handleConfirmAccounts}
          />
        )}

        {/* Set Due Date Dialog */}
        <Dialog open={showSetDueDateDialog} onOpenChange={setShowSetDueDateDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Set Payment Due Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Set a payment due date for {cardForDueDate?.nickname || `${cardForDueDate?.institution_name} - ${cardForDueDate?.account_name}`}
              </p>
              <div className="space-y-2">
                <Label htmlFor="due_date">Payment Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSetDueDateDialog(false);
                  setCardForDueDate(null);
                  setNewDueDate('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetDueDate}
                disabled={!newDueDate}
              >
                Set Due Date
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search Buying Opportunities Dialog */}
        <Dialog open={showSearchOpportunities} onOpenChange={setShowSearchOpportunities}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Search Buying Opportunities
              </DialogTitle>
              <DialogDescription>
                Search by amount to find when you can spend it, or by date to see how much you can spend on that day. All results reflect transactions within the next 3 months only.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'amount' | 'date')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Search by Amount
                </TabsTrigger>
                <TabsTrigger value="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Search by Date
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="amount" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="search-amount">Enter amount you want to spend</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="search-amount"
                        type="number"
                        placeholder="0.00"
                        value={searchAmount}
                        onChange={(e) => setSearchAmount(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="h-[400px] pr-4">
                  {searchAmount && parseFloat(searchAmount) > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        const amount = parseFloat(searchAmount);
                        // Find the earliest opportunity where balance >= amount
                        const matchingOpp = creditCardOpportunities.find(opp => opp.balance >= amount);
                        
                        if (!matchingOpp) {
                          return (
                            <div className="text-center p-8 text-muted-foreground">
                              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="font-medium">No opportunities found for ${searchAmount}</p>
                              <p className="text-sm mt-2">Try a lower amount or check back later</p>
                            </div>
                          );
                        }
                        
                        const [year, month, day] = matchingOpp.date.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        const formattedDate = date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                        
                        let availableDate = '';
                        if (matchingOpp.available_date) {
                          const [aYear, aMonth, aDay] = matchingOpp.available_date.split('-').map(Number);
                          const aDate = new Date(aYear, aMonth - 1, aDay);
                          availableDate = aDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        }
                        
                        return (
                          <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="text-2xl font-bold text-blue-600">
                                  ${matchingOpp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-muted-foreground">Available</div>
                              </div>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                Can afford ${searchAmount}
                              </Badge>
                            </div>
                            <Separator className="my-2" />
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Low Point Date:</span>
                                <span className="font-medium">{formattedDate}</span>
                              </div>
                              {availableDate && (
                                <div className="flex justify-between p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                                  <span className="text-blue-700 dark:text-blue-400 font-medium">Earliest Purchase:</span>
                                  <span className="font-bold text-blue-600">{availableDate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Enter an amount to see when you can spend it</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="date" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="search-date">Select a date</Label>
                  <Input
                    id="search-date"
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                  />
                </div>
                
                <ScrollArea className="h-[400px] pr-4">
                  {searchDate ? (
                    <div className="space-y-3">
                      {(() => {
                        const searchDateObj = new Date(searchDate + 'T00:00:00');
                        
                        // Find the opportunity where the selected date falls within the range [earliest_purchase_date, low_point_date]
                        let relevantOpp = null;
                        for (const opp of creditCardOpportunities) {
                          const [year, month, day] = opp.date.split('-').map(Number);
                          const lowPointDate = new Date(year, month - 1, day);
                          
                          let earliestPurchaseDate = lowPointDate;
                          if (opp.available_date) {
                            const [aYear, aMonth, aDay] = opp.available_date.split('-').map(Number);
                            earliestPurchaseDate = new Date(aYear, aMonth - 1, aDay);
                          }
                          
                          // Check if selected date is within the opportunity range
                          if (searchDateObj >= earliestPurchaseDate && searchDateObj <= lowPointDate) {
                            relevantOpp = opp;
                            break;
                          }
                        }
                        
                        // If no opportunity matches, show a message
                        if (!relevantOpp) {
                          return (
                            <div className="text-center p-8 text-muted-foreground">
                              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="font-medium">No buying opportunity available for this date</p>
                              <p className="text-sm mt-2">The selected date doesn't fall within any opportunity range</p>
                            </div>
                          );
                        }
                        
                        const [year, month, day] = relevantOpp.date.split('-').map(Number);
                        const lowDate = new Date(year, month - 1, day);
                        const formattedLowDate = lowDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                        
                        let availableDate = '';
                        let earliestPurchaseDate = lowDate;
                        if (relevantOpp.available_date) {
                          const [aYear, aMonth, aDay] = relevantOpp.available_date.split('-').map(Number);
                          earliestPurchaseDate = new Date(aYear, aMonth - 1, aDay);
                          availableDate = earliestPurchaseDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        }
                        
                        const canPurchase = searchDateObj >= earliestPurchaseDate;
                        
                        return (
                          <div className="p-6 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                            <div className="text-center mb-4">
                              <div className="text-xs text-muted-foreground mb-2">
                                On {new Date(searchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className="text-4xl font-bold text-blue-600">
                                ${relevantOpp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">Available to spend</div>
                            </div>
                            
                            <Separator className="my-4" />
                            
                            <div className="space-y-3">
                              <div className={`p-3 rounded-lg ${canPurchase ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {canPurchase ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                  )}
                                  <span className={`text-sm font-semibold ${canPurchase ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {canPurchase ? 'Ready to Purchase' : 'Not Yet Available'}
                                  </span>
                                </div>
                                {!canPurchase && availableDate && (
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Earliest purchase date: {availableDate}
                                  </p>
                                )}
                              </div>
                              
                              <div className="text-xs space-y-2 p-3 bg-muted/50 rounded-lg">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Based on low point:</span>
                                  <span className="font-medium">{formattedLowDate}</span>
                                </div>
                                <p className="text-muted-foreground italic">
                                  Assumes $0 spending between now and the selected date
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Select a date to see available spending amount</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Manual Credit Card Dialog */}
        <ManualCreditCardDialog
          open={showManualDialog}
          onOpenChange={setShowManualDialog}
          card={manualEditingCard}
          onSuccess={() => {
            window.location.reload();
          }}
        />
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