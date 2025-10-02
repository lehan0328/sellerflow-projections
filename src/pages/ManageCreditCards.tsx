import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { CreditCard, ArrowLeft, Plus, Trash2, RefreshCw, ExternalLink, Edit } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";
import { useCreditCards } from "@/hooks/useCreditCards";
import { supabase } from "@/integrations/supabase/client";

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

export default function ManageCreditCards() {
  const navigate = useNavigate();
  const { creditCards, isLoading, totalCreditLimit, totalBalance, totalAvailableCredit, addCreditCard, updateCreditCard, removeCreditCard, syncCreditCard } = useCreditCards();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getUtilizationPercentage = (balance: number, limit: number) => {
    return Math.min((balance / limit) * 100, 100);
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

  const handleSyncCard = async (cardId: string) => {
    setIsSyncing(cardId);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = await syncCreditCard(cardId);
      if (success) {
        toast.success("Credit card synced successfully!");
      }
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    if (confirm('Are you sure you want to remove this credit card?')) {
      await removeCreditCard(cardId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading credit cards...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manage Credit Cards</h1>
              <p className="text-muted-foreground">Connect and manage your credit cards with Plaid</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleConnectPlaid}
              disabled={isConnecting}
              className="bg-primary hover:bg-primary/90"
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect via Plaid
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Connected Cards</p>
                <p className="text-2xl font-bold text-foreground">{creditCards.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Limit</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalCreditLimit)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Available Credit</p>
                <p className="text-2xl font-bold text-positive">{formatCurrency(totalAvailableCredit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Cards List */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Connected Credit Cards</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditCards.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No credit cards connected</h3>
                <p className="text-muted-foreground mb-4">Connect your first credit card to get started</p>
                <div className="flex justify-center space-x-2">
                  <Button 
                    onClick={handleConnectPlaid}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Connect via Plaid
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              creditCards.map((card) => {
                const utilizationPercentage = getUtilizationPercentage(card.balance, card.credit_limit);
                const isOverLimit = card.available_credit < 0;
                
                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-gradient-card hover:shadow-card transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-foreground">
                            {card.institution_name} - {card.account_name}
                          </h4>
                          {card.masked_account_number && (
                            <Badge variant="outline" className="text-xs">
                              *{card.masked_account_number.slice(-4)}
                            </Badge>
                          )}
                          {isOverLimit && (
                            <Badge variant="destructive" className="text-xs">
                              Over Limit
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(card.balance)} of {formatCurrency(card.credit_limit)} • {utilizationPercentage.toFixed(1)}% utilization
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last sync: {new Date(card.last_sync).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-foreground">
                          {formatCurrency(card.available_credit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${card.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-xs text-muted-foreground">
                            {card.is_active ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCard(card)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncCard(card.id)}
                          disabled={isSyncing === card.id}
                        >
                          <RefreshCw className={`h-4 w-4 ${isSyncing === card.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCard(card.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

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

        {/* Plaid Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">About Plaid Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>• Bank-level security with 256-bit encryption</p>
              <p>• Real-time balance and transaction data</p>
              <p>• Supports credit cards from 11,000+ financial institutions</p>
              <p>• Read-only access - we cannot make payments or transfers</p>
              <div className="flex items-center space-x-2 pt-2">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href="https://plaid.com/security/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Learn more about Plaid security
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}