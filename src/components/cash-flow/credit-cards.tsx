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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CreditCard, Calendar, AlertTriangle, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { toast } from "sonner";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

export function CreditCards() {
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
  const [newStatementBalance, setNewStatementBalance] = useState('');
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
    if (!cardForDueDate || !newDueDate || !newStatementBalance) return;

    const updateData: any = {
      payment_due_date: newDueDate,
      statement_balance: parseFloat(newStatementBalance)
    };

    const success = await updateCreditCard(cardForDueDate.id, updateData);

    if (success) {
      toast.success("Payment details updated successfully");
      setShowSetDueDateDialog(false);
      setCardForDueDate(null);
      setNewDueDate('');
      setNewStatementBalance('');
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
                              setNewStatementBalance('');
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
              <DialogTitle>Set Payment Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Set payment details for {cardForDueDate?.nickname || `${cardForDueDate?.institution_name} - ${cardForDueDate?.account_name}`}
              </p>
              <div className="space-y-2">
                <Label htmlFor="due_date">Payment Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newDueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {newDueDate ? format(new Date(newDueDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newDueDate ? new Date(newDueDate) : undefined}
                      onSelect={(date) => setNewDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="statement_balance">Statement Balance <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="statement_balance"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={newStatementBalance}
                    onChange={(e) => setNewStatementBalance(e.target.value)}
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required to accurately forecast your credit card bills
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSetDueDateDialog(false);
                  setCardForDueDate(null);
                  setNewDueDate('');
                  setNewStatementBalance('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetDueDate}
                disabled={!newDueDate || !newStatementBalance}
              >
                Save Details
              </Button>
            </div>
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