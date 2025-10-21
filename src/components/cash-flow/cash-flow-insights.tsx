import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, AlertCircle, Loader2, MessageCircle, Send, Pencil, Check, X, CreditCard, ShoppingCart, Info, RefreshCw, Settings, DollarSign, Calendar, ArrowLeft } from "lucide-react";
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
  canUpdateReserve?: boolean;
  lastReserveUpdate?: Date | null;
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
  canUpdateReserve = true,
  lastReserveUpdate = null,
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
  const [showSearchOpportunities, setShowSearchOpportunities] = useState(false);
  const [showAllCreditCards, setShowAllCreditCards] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [searchType, setSearchType] = useState<'amount' | 'date'>('amount');
  const [searchAmount, setSearchAmount] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [tempProjections, setTempProjections] = useState<Array<{ amount: number; date: string }>>([]);
  const [projectionAmount, setProjectionAmount] = useState('');
  const [projectionDate, setProjectionDate] = useState('');
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isEditingReserve, setIsEditingReserve] = useState(false);
  const [editReserveValue, setEditReserveValue] = useState(reserveAmount.toString());
  const [isForecastGenerating, setIsForecastGenerating] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userConfidenceThreshold, setUserConfidenceThreshold] = useState<number>(0);
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
      
      if (data?.forecast_confidence_threshold !== undefined && data?.forecast_confidence_threshold !== null) {
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
            
            const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts-math', {
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
      const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts-math', {
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
      } catch (error) {
        // Error toast is already shown by the hook
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

  // Handle adding a temporary PO projection
  const handleAddProjection = () => {
    if (!projectionAmount || !projectionDate) return;
    
    const amount = parseFloat(projectionAmount);
    if (amount <= 0) return;

    setTempProjections(prev => [...prev, { amount, date: projectionDate }]);
    setProjectionAmount('');
    setProjectionDate('');
    
    // Parse date locally to avoid timezone shift
    const [year, month, day] = projectionDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    
    toast({
      title: "Projection Added",
      description: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on ${localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    });
  };

  // Handle clearing all projections
  const handleClearProjections = () => {
    setTempProjections([]);
    toast({
      title: "Projections Cleared",
      description: "All temporary projections have been removed",
    });
  };

  // Calculate adjusted opportunities with temporary projections
  const getAdjustedOpportunities = () => {
    if (tempProjections.length === 0) return allBuyingOpportunities;

    // Create a map of dates to projected expenses
    const projectionsByDate = tempProjections.reduce((acc, proj) => {
      acc[proj.date] = (acc[proj.date] || 0) + proj.amount;
      return acc;
    }, {} as Record<string, number>);

    // First pass: Calculate adjusted balance for each opportunity
    const adjustedOpps = allBuyingOpportunities.map(opp => {
      let totalProjectionsBeforeDate = 0;
      
      // Sum all projections that occur before or on this opportunity date
      for (const [projDate, projAmount] of Object.entries(projectionsByDate)) {
        if (projDate <= opp.date) {
          totalProjectionsBeforeDate += projAmount;
        }
      }

      return {
        ...opp,
        balance: opp.balance - totalProjectionsBeforeDate
      };
    }).filter(opp => opp.balance > 0); // Only show opportunities with positive balance

    // Second pass: Hide opportunities where future dates have lower safe spending
    // This prevents showing high spending today when a future PO will cause overdraft
    return adjustedOpps.filter((opp, index) => {
      // Find the minimum balance from this opportunity forward
      const minFutureBalance = Math.min(
        opp.balance,
        ...adjustedOpps.slice(index + 1).map(futureOpp => futureOpp.balance)
      );
      
      // Only show this opportunity if it doesn't exceed the minimum future balance
      return opp.balance <= minFutureBalance || adjustedOpps.slice(index + 1).length === 0;
    });
  };

  const adjustedOpportunities = getAdjustedOpportunities();


  return <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </div>
          <div className="flex items-center gap-3">
            <Button variant={chatMode ? "default" : "ghost"} size="sm" onClick={() => setChatMode(!chatMode)}>
              <MessageCircle className="h-4 w-4 mr-1" />
              {chatMode ? "Back" : "Chat"}
            </Button>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          All projections reflect transactions within the next 3 months only
        </p>
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
                          Calculated by projecting your balance 90 days (3 months) into the future, considering all income and expenses. 
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
                      ${safeSpendingLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        ${allBuyingOpportunities[1].balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        -${reserveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7" 
                        onClick={() => setIsEditingReserve(true)}
                        disabled={!canUpdateReserve}
                        title={!canUpdateReserve && lastReserveUpdate 
                          ? `Can be changed in ${Math.ceil(24 - ((Date.now() - lastReserveUpdate.getTime()) / (1000 * 60 * 60)))} hours` 
                          : "Edit reserve amount"
                        }
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>}
                </div>
                {!canUpdateReserve && lastReserveUpdate && (
                  <div className="text-xs text-amber-600 italic px-2">
                    ⏱️ Reserve can be changed again in {Math.ceil(24 - ((Date.now() - lastReserveUpdate.getTime()) / (1000 * 60 * 60)))} hours
                  </div>
                )}
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Lowest Projected</span>
                    <span className="font-semibold text-orange-600">
                      ${projectedLowestBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        ${creditCards.reduce((sum, card) => sum + card.available_credit, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* All Buying Opportunities Modal - List View */}
      <Dialog open={showAllOpportunities} onOpenChange={setShowAllOpportunities}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              All Buying Opportunities
            </DialogTitle>
            <DialogDescription>
              View all your upcoming buying opportunities based on projected cash flow. All opportunities reflect transactions within the next 3 months only.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 px-1">
            <Button 
              onClick={() => {
                setShowAllOpportunities(false);
                setShowSearchOpportunities(true);
              }}
              className="w-full"
              variant="outline"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Search by Amount or Date
            </Button>
            
            {/* PO Projections Section */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-orange-600" />
                  Project Purchase Orders
                </h4>
                {tempProjections.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearProjections}
                    className="h-6 text-xs text-destructive hover:text-destructive"
                  >
                    Clear ({tempProjections.length})
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Simulate POs to see impact on opportunities
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="projection-amount" className="text-xs">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <Input
                      id="projection-amount"
                      type="number"
                      placeholder="0.00"
                      value={projectionAmount}
                      onChange={(e) => setProjectionAmount(e.target.value)}
                      className="pl-5 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="projection-date" className="text-xs">Date</Label>
                  <Input
                    id="projection-date"
                    type="date"
                    value={projectionDate}
                    onChange={(e) => setProjectionDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleAddProjection}
                disabled={!projectionAmount || !projectionDate || parseFloat(projectionAmount) <= 0}
                className="w-full h-8"
                size="sm"
                variant="outline"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Add Projection
              </Button>
              
              {tempProjections.length > 0 && (
                <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800 mt-2">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1.5">
                    🔮 Active Projections
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {tempProjections.map((proj, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>${proj.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span>{new Date(proj.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2 pb-4">
              {adjustedOpportunities.map((opp, index) => {
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
                    day: 'numeric',
                    year: 'numeric'
                  });
                }
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${opp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">Safe to spend</div>
                      </div>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                        Opportunity #{index + 1}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Low Point Date:</span>
                        <span className="font-medium">{formattedDate}</span>
                      </div>
                      {availableDate && (
                        <div className="flex justify-between p-2 bg-green-100 dark:bg-green-900/30 rounded">
                          <span className="text-green-700 dark:text-green-400 font-medium">Earliest Purchase:</span>
                          <span className="font-bold text-green-600">{availableDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Opportunities Modal */}
      <Dialog open={showSearchOpportunities} onOpenChange={setShowSearchOpportunities}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowSearchOpportunities(false);
                  setShowAllOpportunities(true);
                }}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
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
                      const matchingOpp = adjustedOpportunities.find(opp => opp.balance >= amount);
                      
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
                        <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-2xl font-bold text-green-600">
                                ${matchingOpp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-muted-foreground">Available</div>
                            </div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
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
                              <div className="flex justify-between p-2 bg-green-100 dark:bg-green-900/30 rounded">
                                <span className="text-green-700 dark:text-green-400 font-medium">Earliest Purchase:</span>
                                <span className="font-bold text-green-600">{availableDate}</span>
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
                      for (const opp of adjustedOpportunities) {
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
                    ${creditCards.reduce((sum, card) => sum + card.available_credit, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        ${card.available_credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {isOverLimit && (
                      <div className="flex items-start gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 dark:text-red-400">
                          Over limit by ${Math.abs(currentAvailableSpend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    
                    {/* Available to Spend Section */}
                    <div className={`p-3 rounded-lg border-2 ${currentAvailableSpend < 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-green-50 dark:bg-green-950/20 border-green-500'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Available to Spend</span>
                        <span className={`text-lg font-bold ${currentAvailableSpend < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.max(0, currentAvailableSpend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        After pending orders: ${pendingOrders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                ${opp.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <span className="font-medium">${card.credit_limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {pendingOrders > 0 && (
                        <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                          <span className="text-muted-foreground">Pending Orders</span>
                          <span className="font-medium text-orange-600">-${pendingOrders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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