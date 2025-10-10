import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, TrendingUp, AlertCircle, Loader2, MessageCircle, Send, Pencil, Check, X, CreditCard, ShoppingCart, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useNavigate } from "react-router-dom";
interface CashFlowInsightsProps {
  currentBalance: number;
  dailyInflow: number;
  dailyOutflow: number;
  upcomingExpenses: number;
  events?: any[];
  vendors?: any[];
  income?: any[];
  safeSpendingLimit?: number;
  reserveAmount?: number;
  projectedLowestBalance?: number;
  lowestBalanceDate?: string;
  safeSpendingAvailableDate?: string;
  nextBuyingOpportunityBalance?: number;
  nextBuyingOpportunityDate?: string;
  nextBuyingOpportunityAvailableDate?: string;
  allBuyingOpportunities?: Array<{ date: string; balance: number; available_date?: string }>;
  onUpdateReserveAmount?: (amount: number) => Promise<void>;
  transactionMatchButton?: React.ReactNode;
}
export const CashFlowInsights = ({
  currentBalance,
  dailyInflow,
  dailyOutflow,
  upcomingExpenses,
  events = [],
  vendors = [],
  income = [],
  safeSpendingLimit = 0,
  reserveAmount = 0,
  projectedLowestBalance = 0,
  lowestBalanceDate = "",
  safeSpendingAvailableDate,
  nextBuyingOpportunityBalance,
  nextBuyingOpportunityDate,
  nextBuyingOpportunityAvailableDate,
  allBuyingOpportunities = [],
  onUpdateReserveAmount,
  transactionMatchButton
}: CashFlowInsightsProps) => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const [pendingOrdersByCard, setPendingOrdersByCard] = useState<Record<string, number>>({});
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [showAllCreditCards, setShowAllCreditCards] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isEditingReserve, setIsEditingReserve] = useState(false);
  const [editReserveValue, setEditReserveValue] = useState(reserveAmount.toString());
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>(() => {
    // Load conversation history from localStorage on mount
    const saved = localStorage.getItem('cashflow-chat-history');
    return saved ? JSON.parse(saved) : [];
  });
  const netDaily = dailyInflow - dailyOutflow;
  const healthStatus = netDaily >= 0 ? "positive" : "negative";

  // Update edit value when reserveAmount prop changes
  useEffect(() => {
    setEditReserveValue(reserveAmount.toString());
  }, [reserveAmount]);
  const handleSaveReserve = async () => {
    const newAmount = parseFloat(editReserveValue);
    if (isNaN(newAmount) || newAmount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }
    if (onUpdateReserveAmount) {
      try {
        await onUpdateReserveAmount(newAmount);
        setIsEditingReserve(false);
        toast({
          title: "Reserve amount updated",
          description: `Your reserve is now set to $${newAmount.toLocaleString()}`
        });
      } catch (error) {
        toast({
          title: "Error updating reserve",
          description: "Please try again",
          variant: "destructive"
        });
      }
    }
  };
  const handleCancelEdit = () => {
    setEditReserveValue(reserveAmount.toString());
    setIsEditingReserve(false);
  };

  // Save conversation history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cashflow-chat-history', JSON.stringify(conversationHistory));
  }, [conversationHistory]);

  // Fetch pending purchase orders for each credit card
  useEffect(() => {
    const fetchPendingOrders = async () => {
      if (!creditCards || creditCards.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: transactions } = await supabase
        .from('transactions')
        .select('credit_card_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'purchase_order')
        .eq('status', 'pending')
        .not('credit_card_id', 'is', null);

      if (transactions) {
        const ordersByCard: Record<string, number> = {};
        transactions.forEach(tx => {
          if (tx.credit_card_id) {
            ordersByCard[tx.credit_card_id] = (ordersByCard[tx.credit_card_id] || 0) + Number(tx.amount);
          }
        });
        setPendingOrdersByCard(ordersByCard);
      }
    };

    fetchPendingOrders();
  }, [creditCards]);
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    const currentQuestion = chatQuestion.trim();

    // Add user message to history immediately
    setConversationHistory(prev => [...prev, {
      role: 'user',
      content: currentQuestion
    }]);
    setChatQuestion(""); // Clear input field
    setChatLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data,
        error
      } = await supabase.functions.invoke("cash-flow-chat", {
        body: {
          question: currentQuestion,
          userId: user.id,
          conversationHistory: conversationHistory
        }
      });
      if (error) throw error;
      if (data?.answer) {
        // Add assistant response to history
        setConversationHistory(prev => [...prev, {
          role: 'assistant',
          content: data.answer
        }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = "Unable to get an answer. Please try again later.";

      // Add error message to history
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setChatLoading(false);
    }
  };


  return <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </div>
          <div className="flex items-center gap-2">
            <Button variant={chatMode ? "default" : "ghost"} size="sm" onClick={() => setChatMode(!chatMode)}>
              <MessageCircle className="h-4 w-4 mr-1" />
              {chatMode ? "Back" : "Chat"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-auto">
        {chatMode ? <div className="flex flex-col h-full space-y-4">
            {/* Conversation History */}
            {conversationHistory.length > 0 && <ScrollArea className="flex-1 h-[400px]">
                <div className="space-y-3 pr-4">
                  {conversationHistory.map((message, index) => <div key={index} className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>)}
                  {chatLoading && <div className="flex items-center gap-2 p-3 bg-muted mr-8 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>}
                </div>
              </ScrollArea>}

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="space-y-3 flex-shrink-0">
              <div className="flex gap-2">
                <Input placeholder="Ask about your cash flow..." value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} disabled={chatLoading} className="flex-1" />
                <Button type="submit" disabled={chatLoading || !chatQuestion.trim()} size="icon">
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {conversationHistory.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => {
            setConversationHistory([]);
            localStorage.removeItem('cashflow-chat-history');
          }} className="w-full">
                  Clear Chat History
                </Button>}
            </form>
          </div> : <>
            {/* Safe Spending Power */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Safe Spending Power
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Calculated by projecting your balance 180 days into the future, considering all income and expenses. 
                          We find your lowest projected balance, subtract your reserve amount, and that's what you can safely spend today without risking shortfalls.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h4>
                {allBuyingOpportunities.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAllOpportunities(true)}
                    className="text-xs"
                  >
                    See All ({allBuyingOpportunities.length})
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border-2 ${safeSpendingLimit < 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-primary/10 border-primary/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Available to Spend</span>
                      {safeSpendingLimit < 0 && <AlertCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    <span className={`text-2xl font-bold ${safeSpendingLimit < 0 ? 'text-red-600' : 'text-primary'}`}>
                      ${safeSpendingLimit.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is what you can safely spend without risking shortfalls
                  </p>
                  {safeSpendingLimit < 0 && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                      <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 dark:text-red-400">
                        Warning: Your upcoming expenses exceed available funds. Consider reducing spending or increasing reserves.
                      </p>
                    </div>
                  )}
                  {safeSpendingAvailableDate && (
                    <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <span className="text-xs text-muted-foreground">Earliest Purchase Date:</span>
                      <span className="text-sm font-semibold text-green-600">
                        {(() => {
                          const [year, month, day] = safeSpendingAvailableDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          });
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Reserve Amount</span>
                  {isEditingReserve ? <div className="flex items-center gap-2">
                      <Input type="number" value={editReserveValue} onChange={e => setEditReserveValue(e.target.value)} className="h-7 w-24 text-right" min="0" step="100" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveReserve}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div> : <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-600">
                        -${reserveAmount.toLocaleString()}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingReserve(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>}
                </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Lowest Projected</span>
                    <span className="font-semibold text-orange-600">
                      ${projectedLowestBalance.toLocaleString()}
                    </span>
                  </div>
                  {lowestBalanceDate && <p className="text-xs text-muted-foreground italic p-2">
                      Your balance will reach its lowest point on {(() => {
                        const [year, month, day] = lowestBalanceDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      })()}
                    </p>}
                  
                  {allBuyingOpportunities && allBuyingOpportunities.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAllOpportunities(true)}
                      className="w-full"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View All {allBuyingOpportunities.length} {allBuyingOpportunities.length === 1 ? 'Opportunity' : 'Opportunities'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Alert */}
            {upcomingExpenses > 0}

            {/* Credit Card Spending Power */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Card Spending Power
              </h4>
              {cardsLoading ? (
                <div className="flex items-center justify-center p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : creditCards.length === 0 ? (
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">No credit cards added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Total Available Credit Summary */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Total Available Credit</span>
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-600">
                        ${creditCards.reduce((sum, card) => sum + card.available_credit, 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        across {creditCards.length} {creditCards.length === 1 ? 'card' : 'cards'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Combined spending power from all your credit cards
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAllCreditCards(true)}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    See All {creditCards.length} {creditCards.length === 1 ? 'Card' : 'Cards'}
                  </Button>
                  
                  {/* Transaction Match Button */}
                  {transactionMatchButton && (
                    <div className="mt-3">
                      {transactionMatchButton}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>}
      </CardContent>

      {/* All Buying Opportunities Modal */}
      <Dialog open={showAllOpportunities} onOpenChange={setShowAllOpportunities}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              All Buying Opportunities (Next 3 Months)
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                <span className="font-semibold text-amber-600">Important:</span> These opportunities assume <span className="font-semibold">$0 spending until each date</span>. The available amounts shown are what you'll have if you don't make any purchases before then. Plan your spending timeline accordingly to preserve these opportunities.
              </p>
              {allBuyingOpportunities.map((opp, index) => {
                const [year, month, day] = opp.date.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                let availableDate = '';
                if (opp.available_date) {
                  const [aYear, aMonth, aDay] = opp.available_date.split('-').map(Number);
                  const aDate = new Date(aYear, aMonth - 1, aDay);
                  availableDate = aDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                }
                
                return (
                  <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">Opportunity #{index + 1}</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${opp.balance.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Low point: {formattedDate}</p>
                    {availableDate && (
                      <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                        <span className="text-xs text-muted-foreground">Earliest Purchase Date:</span>
                        <span className="text-sm font-semibold text-green-600">{availableDate}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* All Credit Cards Modal */}
      <Dialog open={showAllCreditCards} onOpenChange={setShowAllCreditCards}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              All Credit Cards
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Available</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${creditCards.reduce((sum, card) => sum + card.available_credit, 0).toLocaleString()}
                  </span>
                </div>
              </div>
              
              {creditCards.map((card) => {
                const pendingOrders = pendingOrdersByCard[card.id] || 0;
                const availableSpend = card.available_credit;
                const isOverLimit = availableSpend < 0;
                
                return (
                  <div key={card.id} className={`p-4 rounded-lg space-y-3 ${isOverLimit ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-500' : 'bg-muted/50 border border-border'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">{card.account_name}</p>
                          {isOverLimit && <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{card.institution_name}</p>
                      </div>
                      <span className={`text-xl font-bold flex-shrink-0 ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                        ${availableSpend.toLocaleString()}
                      </span>
                    </div>
                    
                    {isOverLimit && (
                      <div className="flex items-start gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 dark:text-red-400">
                          Over limit by ${Math.abs(availableSpend).toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                        <span className="text-muted-foreground">Credit Limit</span>
                        <span className="font-medium">${card.credit_limit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                        <span className="text-muted-foreground">Current Balance</span>
                        <span className="font-medium">${card.balance.toLocaleString()}</span>
                      </div>
                      {pendingOrders > 0 && (
                        <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                          <span className="text-muted-foreground">Pending Orders</span>
                          <span className="font-medium text-orange-600">-${pendingOrders.toLocaleString()}</span>
                        </div>
                      )}
                      {card.payment_due_date && (
                        <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                          <span className="text-muted-foreground">Payment Due</span>
                          <span className="font-medium">
                            {new Date(card.payment_due_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>;
};