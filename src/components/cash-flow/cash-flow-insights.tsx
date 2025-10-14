import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Sparkles, TrendingUp, AlertCircle, Loader2, MessageCircle, Send, Pencil, Check, X, CreditCard, ShoppingCart, Info, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAuth } from "@/hooks/useAuth";
import { AmazonTransactionHistory } from "./amazon-transaction-history";
import aurenLogo from "@/assets/auren-icon-blue.png";
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
  const { user } = useAuth();
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const { amazonPayouts, refetch: refetchPayouts } = useAmazonPayouts();
  const [pendingOrdersByCard, setPendingOrdersByCard] = useState<Record<string, number>>({});
  const [cardOpportunities, setCardOpportunities] = useState<Record<string, Array<{ date: string; availableCredit: number }>>>({});
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [showAllCreditCards, setShowAllCreditCards] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isEditingReserve, setIsEditingReserve] = useState(false);
  const [editReserveValue, setEditReserveValue] = useState(reserveAmount.toString());
  const [isForecastGenerating, setIsForecastGenerating] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userConfidenceThreshold, setUserConfidenceThreshold] = useState<number>(88);
  const [show100PercentOnly, setShow100PercentOnly] = useState<boolean>(false);
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

  // Debug: Log the received values
  useEffect(() => {
    console.log('💰 CashFlowInsights received:', {
      safeSpendingLimit,
      reserveAmount,
      projectedLowestBalance,
      calculation: `${projectedLowestBalance} - ${reserveAmount} = ${projectedLowestBalance - reserveAmount}`,
      expectedSafeSpending: projectedLowestBalance - reserveAmount
    });
  }, [safeSpendingLimit, reserveAmount, projectedLowestBalance]);

  // Update edit value when reserveAmount prop changes
  useEffect(() => {
    setEditReserveValue(reserveAmount.toString());
  }, [reserveAmount]);


  // Load last refresh time and confidence threshold from user_settings
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_settings')
        .select('last_forecast_refresh, forecast_confidence_threshold')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.last_forecast_refresh) {
        setLastRefreshTime(new Date(data.last_forecast_refresh).getTime());
      }
      
      if (data?.forecast_confidence_threshold) {
        setUserConfidenceThreshold(data.forecast_confidence_threshold);
      }
    };
    
    loadUserSettings();
  }, [user]);

  // Auto-generate forecasts on mount if needed - with debouncing to prevent spam
  useEffect(() => {
    let isSubscribed = true;
    const timeoutId = setTimeout(() => {
      const generateForecasts = async () => {
        if (!user || !isSubscribed) return;
        
        const forecastedPayouts = amazonPayouts.filter(p => p.status === 'forecasted');
        const confirmedPayouts = amazonPayouts.filter(p => p.status !== 'forecasted');
        
        // Only generate if we have at least 1 payout but no forecasts
        if (confirmedPayouts.length >= 1 && forecastedPayouts.length === 0 && !isForecastGenerating) {
          console.log('🚀 Starting forecast generation...');
          setIsForecastGenerating(true);
          
          try {
            // Delete old forecasts first
            await supabase
              .from('amazon_payouts')
              .delete()
              .eq('user_id', user.id)
              .eq('status', 'forecasted');
            
            const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts', {
              body: { userId: user.id }
            });
            
            if (!isSubscribed) return;
            
            if (error) {
              console.error('Forecast generation error:', error);
              setIsForecastGenerating(false);
            } else if (data?.success) {
              console.log('✅ Amazon payouts forecasted successfully');
              // Refetch to get fresh data
              await refetchPayouts();
              setIsForecastGenerating(false);
            } else {
              console.error('Unexpected response:', data);
              setIsForecastGenerating(false);
            }
          } catch (err) {
            console.error('Failed to generate forecasts:', err);
            if (isSubscribed) {
              setIsForecastGenerating(false);
            }
          }
        } else if (isForecastGenerating && forecastedPayouts.length > 0) {
          // Reset generating state if forecasts exist
          setIsForecastGenerating(false);
        }
      };

      generateForecasts();
    }, 1000); // Debounce for 1 second
    
    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, [user, amazonPayouts.length]); // Only depend on length to avoid re-running on every data change

  const handleGenerateForecast = async () => {
    if (!user) return;
    
    // Check 24-hour cooldown
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (lastRefreshTime && (now - lastRefreshTime) < twentyFourHours) {
      const hoursRemaining = Math.ceil((twentyFourHours - (now - lastRefreshTime)) / (60 * 60 * 1000));
      toast({
        title: "Generation limit reached",
        description: `You can generate a new forecast in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`,
        variant: "destructive"
      });
      return;
    }
    
    setIsRefreshing(true);
    setIsForecastGenerating(true);
    
    toast({
      title: "Generating high-confidence forecast...",
      description: "Creating AI-powered Amazon payout predictions (88-95% confidence)"
    });
    
    try {
      // Delete existing forecasted payouts
      await supabase
        .from('amazon_payouts')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'forecasted');
      
      // Generate new forecasts
      const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        // Update last refresh time
        const refreshTime = new Date().toISOString();
        await supabase
          .from('user_settings')
          .update({ last_forecast_refresh: refreshTime })
          .eq('user_id', user.id);
        
        setLastRefreshTime(Date.now());
        
        toast({
          title: "High-confidence forecast generated!",
          description: `Created ${data.forecast?.predictions?.length || 0} predictions with 88-95% confidence. Buying opportunities updated!`
        });
        
        await refetchPayouts();
      }
    } catch (err) {
      console.error('Failed to generate forecast:', err);
      toast({
        title: "Generation failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
      setIsForecastGenerating(false);
    }
  };
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
        .eq('archived', false)
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
  
  // Calculate buying opportunities for each credit card
  useEffect(() => {
    const calculateCardOpportunities = () => {
      if (!creditCards || creditCards.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const opportunitiesMap: Record<string, Array<{ date: string; availableCredit: number }>> = {};

      for (const card of creditCards) {
        const opportunities: Array<{ date: string; availableCredit: number }> = [];
        
        // Current available credit is always the first opportunity
        opportunities.push({
          date: today.toISOString().split('T')[0],
          availableCredit: card.available_credit
        });

        // If card has statement balance and due date, that's a buying opportunity
        if (card.statement_balance && card.statement_balance > 0 && card.payment_due_date) {
          const paymentDueDate = new Date(card.payment_due_date);
          paymentDueDate.setHours(0, 0, 0, 0);

          // Only include if due date is in the future
          if (paymentDueDate > today) {
            const newAvailableCredit = card.available_credit + Number(card.statement_balance);
            opportunities.push({
              date: paymentDueDate.toISOString().split('T')[0],
              availableCredit: newAvailableCredit
            });
          }
        }

        // Sort opportunities by date
        opportunities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Ensure later opportunities never have lower available credit than earlier ones
        for (let i = 1; i < opportunities.length; i++) {
          if (opportunities[i].availableCredit < opportunities[i - 1].availableCredit) {
            opportunities[i].availableCredit = opportunities[i - 1].availableCredit;
          }
        }

        opportunitiesMap[card.id] = opportunities;
      }

      setCardOpportunities(opportunitiesMap);
    };

    calculateCardOpportunities();
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
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <img src={aurenLogo} alt="AI" className="h-4 w-4" />
                <span className="text-xs font-semibold">AI Payout Forecasts</span>
                {isForecastGenerating && <Loader2 className="h-3 w-3 animate-spin text-purple-600" />}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleGenerateForecast}
                        disabled={isRefreshing || isForecastGenerating}
                        className="h-7 w-7 hover:bg-white/50 dark:hover:bg-black/20"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Generate forecast</p>
                      <p className="text-xs text-muted-foreground">Can only be generated once every 24 hours</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {lastRefreshTime && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Generated {new Date(lastRefreshTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
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
                  <p className="text-xs text-muted-foreground mb-2">
                    This is what you can safely spend without risking shortfalls
                  </p>
                  
                  {safeSpendingAvailableDate && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 mt-2">
                      <span className="text-xs font-medium text-muted-foreground">Earliest Purchase Date:</span>
                      <span className="text-sm font-bold text-blue-600">
                        {(() => {
                          const [year, month, day] = safeSpendingAvailableDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        })()}
                      </span>
                    </div>
                  )}
                  
                  {safeSpendingLimit < 0 && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                      <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 dark:text-red-400">
                        Warning: Your upcoming expenses exceed available funds. Consider reducing spending or increasing reserves.
                      </p>
                    </div>
                  )}
                </div>

                {/* Opportunity #2 Preview */}
                {allBuyingOpportunities.length > 1 && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <h5 className="font-semibold text-xs">Opportunity #2</h5>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        ${allBuyingOpportunities[1].balance.toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Low Point</span>
                        <span className="font-medium">
                          {(() => {
                            const [year, month, day] = allBuyingOpportunities[1].date.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            });
                          })()}
                        </span>
                      </div>
                      {allBuyingOpportunities[1].available_date && (
                        <div className="flex items-center justify-between p-1.5 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                          <span className="text-muted-foreground text-xs">Earliest Purchase Date</span>
                          <span className="font-semibold text-green-600">
                            {(() => {
                              const [year, month, day] = allBuyingOpportunities[1].available_date.split('-').map(Number);
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
                  </div>
                )}

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
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Buying Opportunities Overview (Next 6 Months)
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
            {/* Left Side - Confirmed Buying Opportunities */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Confirmed Cash Opportunities
              </h3>
              <ScrollArea className="h-[500px] pr-4 border rounded-md p-2 bg-gradient-to-b from-transparent via-transparent to-muted/20">
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
            </div>
            
            {/* Vertical Divider */}
            <Separator orientation="vertical" className="h-auto" />
            
            {/* Right Side - Projected Opportunities */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Projected Opportunities
                </h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-100-percent" className="text-xs text-muted-foreground">
                    100% confidence only
                  </Label>
                  <Switch
                    id="show-100-percent"
                    checked={show100PercentOnly}
                    onCheckedChange={setShow100PercentOnly}
                  />
                </div>
              </div>
              <ScrollArea className="h-[500px] pr-4 border rounded-md p-2 bg-gradient-to-b from-transparent via-transparent to-muted/20">
                <div className="space-y-3">
                  {/* Disclaimer */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                          Forecast Disclaimer
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          These are AI-generated predictions based on historical data. We take no responsibility for forecast accuracy. Spend at your own risk. Always maintain adequate cash reserves.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    <span className="font-semibold text-purple-600">Projected Cash + AI Forecast:</span> Shows your projected cash available on the payout date plus the forecasted payout amount. Your confidence threshold: <span className="font-bold">{userConfidenceThreshold}%</span>
                  </p>
                  {(() => {
                    const forecastedPayouts = amazonPayouts?.filter(p => p.status === 'forecasted') || [];
                    
                    // Sort by payout date
                    let sortedPayouts = [...forecastedPayouts].sort((a, b) => 
                      new Date(a.payout_date).getTime() - new Date(b.payout_date).getTime()
                    );

                    // Filter for 100% confidence if enabled
                    if (show100PercentOnly) {
                      sortedPayouts = sortedPayouts.filter(payout => {
                        const payoutData = payout as any;
                        const metadata = payoutData?.raw_settlement_data?.forecast_metadata;
                        const confidence = metadata?.confidence || 0.88;
                        return confidence >= 1.0;
                      });
                    }
                    
                    if (sortedPayouts.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {show100PercentOnly ? 'No 100% confidence forecasts available.' : 'No forecasted payouts yet.'}
                          </p>
                          <p className="text-xs mt-1">
                            {show100PercentOnly ? 'Try adjusting the confidence filter.' : 'Click the refresh button to generate AI forecasts.'}
                          </p>
                        </div>
                      );
                    }
                    
                    return sortedPayouts.map((payout, index) => {
                      const payoutDate = new Date(payout.payout_date);
                      const payoutDateStr = payoutDate.toISOString().split('T')[0];
                      const formattedDate = payoutDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      
                      // Find the closest buying opportunity for this date
                      let projectedCash = 0;
                      const matchingOpp = allBuyingOpportunities.find(opp => opp.date === payoutDateStr);
                      if (matchingOpp) {
                        projectedCash = matchingOpp.balance;
                      } else {
                        // Find the closest date before or on the payout date
                        const sortedOpps = [...allBuyingOpportunities]
                          .filter(opp => opp.date <= payoutDateStr)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        if (sortedOpps.length > 0) {
                          projectedCash = sortedOpps[0].balance;
                        }
                      }
                      
                      const forecastAmount = payout.total_amount || 0;
                      const totalProjected = projectedCash + forecastAmount;
                      
                      const payoutData = payout as any;
                      const metadata = payoutData?.raw_settlement_data?.forecast_metadata;
                      const confidence = metadata?.confidence || 0.88;
                      const confidencePercent = Math.round(confidence * 100);
                      
                      // Determine confidence badge color
                      let confidenceBadgeClass = "bg-green-100 text-green-700 dark:bg-green-900/20";
                      if (confidencePercent < userConfidenceThreshold) {
                        confidenceBadgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/20";
                      }
                      
                      return (
                        <div key={index} className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">Opportunity #{index + 1}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confidenceBadgeClass}`}>
                                  {confidencePercent}% confident
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">Expected: {formattedDate}</p>
                            </div>
                            <span className="text-lg font-bold text-purple-600">
                              ${totalProjected.toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Breakdown */}
                          <div className="text-xs bg-white/50 dark:bg-black/20 rounded p-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Projected Cash:</span>
                              <span className="font-medium">${projectedCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Forecasted Payout:</span>
                              <span className="font-medium text-purple-600">+${forecastAmount.toLocaleString()}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-semibold">
                              <span>Total Available:</span>
                              <span className="text-purple-600">${totalProjected.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Payout Details */}
                          <div className="text-xs bg-white/50 dark:bg-black/20 rounded p-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payout Type:</span>
                              <span className="font-medium">{payout.payout_type || 'bi-weekly'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Marketplace:</span>
                              <span className="font-medium">{payout.marketplace_name || 'Amazon'}</span>
                            </div>
                            {metadata?.calculation_method && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Method:</span>
                                <span className="font-medium text-[10px]">
                                  {metadata.calculation_method.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {confidencePercent < userConfidenceThreshold && (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                                Below your {userConfidenceThreshold}% confidence threshold
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Amazon Transaction History Modal */}
      <AmazonTransactionHistory 
        open={showTransactionHistory}
        onOpenChange={setShowTransactionHistory}
      />

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
              
              {[...creditCards].sort((a, b) => (a.priority || 3) - (b.priority || 3)).map((card) => {
                const pendingOrders = pendingOrdersByCard[card.id] || 0;
                const currentAvailableSpend = card.available_credit - pendingOrders;
                const opportunities = cardOpportunities[card.id] || [];
                const isOverLimit = currentAvailableSpend < 0;
                
                // Priority mapping: 1 = High, 2 = Medium, 3 = Low
                const priorityLabel = card.priority === 1 ? 'High' : card.priority === 2 ? 'Medium' : 'Low';
                const priorityColor = card.priority === 1 ? 'text-green-600' : card.priority === 2 ? 'text-blue-600' : 'text-gray-600';
                
                return (
                  <div key={card.id} className={`p-4 rounded-lg space-y-3 ${isOverLimit ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-500' : 'bg-muted/50 border border-border'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">{card.account_name}</p>
                          <span className={`text-xs font-medium ${priorityColor}`}>
                            {priorityLabel} Priority
                          </span>
                          {isOverLimit && <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{card.institution_name}</p>
                      </div>
                      <span className={`text-xl font-bold flex-shrink-0 ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                        ${card.available_credit.toLocaleString()}
                      </span>
                    </div>
                    
                    {isOverLimit && (
                      <div className="flex items-start gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 dark:text-red-400">
                          Over limit by ${Math.abs(currentAvailableSpend).toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    {/* Available to Spend Section */}
                    <div className={`p-3 rounded-lg border-2 ${currentAvailableSpend < 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-green-50 dark:bg-green-950/20 border-green-500'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Available to Spend</span>
                        <span className={`text-lg font-bold ${currentAvailableSpend < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.max(0, currentAvailableSpend).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        After pending orders: ${pendingOrders.toLocaleString()}
                      </p>
                    </div>
                    
                    {/* Buying Opportunities */}
                    {opportunities.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            Buying Opportunities
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {opportunities.length} found
                          </span>
                        </div>
                        <div className="space-y-1">
                          {opportunities.slice(0, 2).map((opp, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs border border-blue-200 dark:border-blue-800">
                              <span className="text-muted-foreground">
                                {new Date(opp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="font-semibold text-blue-600">
                                ${opp.availableCredit.toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {opportunities.length > 2 && (
                            <p className="text-xs text-center text-muted-foreground py-1">
                              +{opportunities.length - 2} more opportunities
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                        <span className="text-muted-foreground">Credit Limit</span>
                        <span className="font-medium">${card.credit_limit.toLocaleString()}</span>
                      </div>
                      {pendingOrders > 0 && (
                        <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                          <span className="text-muted-foreground">Pending Orders</span>
                          <span className="font-medium text-orange-600">-${pendingOrders.toLocaleString()}</span>
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