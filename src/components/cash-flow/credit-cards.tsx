import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Calendar, AlertTriangle, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CreditCardFormData {
  institution_name: string;
  account_name: string;
  balance: number;
  credit_limit: number;
  minimum_payment: number;
  payment_due_date?: string;
  statement_close_date?: string;
  annual_fee: number;
  interest_rate: number;
}

export function CreditCards() {
  const navigate = useNavigate();
  const { creditCards, isLoading, totalCreditLimit, totalBalance, totalAvailableCredit, addCreditCard, updateCreditCard, removeCreditCard } = useCreditCards();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [formData, setFormData] = useState<CreditCardFormData>({
    institution_name: '',
    account_name: '',
    balance: 0,
    credit_limit: 0,
    minimum_payment: 0,
    payment_due_date: '',
    statement_close_date: '',
    annual_fee: 0,
    interest_rate: 0,
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
      institution_name: '',
      account_name: '',
      balance: 0,
      credit_limit: 0,
      minimum_payment: 0,
      payment_due_date: '',
      statement_close_date: '',
      annual_fee: 0,
      interest_rate: 0,
    });
  };

  const handleAddCard = async () => {
    // Redirect to manage credit cards page for Plaid integration
    window.location.href = '/manage-credit-cards';
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setFormData({
      institution_name: card.institution_name,
      account_name: card.account_name,
      balance: card.balance,
      credit_limit: card.credit_limit,
      minimum_payment: card.minimum_payment,
      payment_due_date: card.payment_due_date || '',
      statement_close_date: card.statement_close_date || '',
      annual_fee: card.annual_fee,
      interest_rate: card.interest_rate,
    });
    setShowEditDialog(true);
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    const success = await updateCreditCard(editingCard.id, {
      ...formData,
      available_credit: formData.credit_limit - formData.balance,
    });

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
              onClick={() => window.location.href = '/manage-credit-cards'}
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
            <Button onClick={() => navigate('/settings', { state: { activeSection: 'credit-cards' } })}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Card
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
                          {card.institution_name} - {card.account_name}
                        </h4>
                        {card.masked_account_number && (
                          <Badge variant="outline" className="text-xs">
                            *{card.masked_account_number.slice(-4)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {card.payment_due_date && (
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            Due: {new Date(card.payment_due_date).toLocaleDateString()}
                          </span>
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

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-semibold text-finance-negative">
                        {formatCurrency(card.balance)}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_institution_name">Institution</Label>
                  <Input
                    id="edit_institution_name"
                    value={formData.institution_name}
                    onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_account_name">Account Name</Label>
                  <Input
                    id="edit_account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_balance">Current Balance</Label>
                  <Input
                    id="edit_balance"
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_credit_limit">Credit Limit</Label>
                  <Input
                    id="edit_credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_minimum_payment">Minimum Payment</Label>
                  <Input
                    id="edit_minimum_payment"
                    type="number"
                    value={formData.minimum_payment}
                    onChange={(e) => setFormData({...formData, minimum_payment: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="edit_interest_rate"
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({...formData, interest_rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
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

// Export the credit card due date events generator - now uses database data
export const getCreditCardDueDates = () => {
  // This will need to be called from a component that has access to the creditCards data
  // For now, return empty array as this functionality should be moved to the dashboard
  return [];
};