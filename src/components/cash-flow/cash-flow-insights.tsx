import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Sparkles, TrendingUp, AlertCircle, Loader2, Pencil, Check, X, CreditCard, ShoppingCart, Info, RefreshCw, Settings, DollarSign, Calendar, ArrowLeft, Search } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { format, addDays } from "date-fns";
import { generateRecurringDates } from "@/lib/recurringDates";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAuth } from "@/hooks/useAuth";
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
  dailyBalances?: Array<{ date: string; balance: number }>;
  onUpdateReserveAmount?: (amount: number) => Promise<void>;
  transactionMatchButton?: React.ReactNode;
  excludeToday?: boolean;
}
export const CashFlowInsights = memo(({
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
  dailyBalances = [],
  onUpdateReserveAmount,
  transactionMatchButton,
  excludeToday = false
}: CashFlowInsightsProps) => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { creditCards, isLoading: cardsLoading, updateCreditCard } = useCreditCards();
  const { amazonPayouts, refetch: refetchPayouts } = useAmazonPayouts();
  const [pendingOrdersByCard, setPendingOrdersByCard] = useState<Record<string, number>>({});
  const [cardOpportunities, setCardOpportunities] = useState<Record<string, Array<{ date: string; availableCredit: number }>>>({});
  const [tempProjections, setTempProjections] = useState<Array<{ amount: number; date: string }>>([]);
  const [projectionAmount, setProjectionAmount] = useState('');
  const [projectionDate, setProjectionDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editingCreditLimit, setEditingCreditLimit] = useState<string | null>(null);
  const [creditLimitOverride, setCreditLimitOverride] = useState('');
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [showSearchOpportunities, setShowSearchOpportunities] = useState(false);
  const [showAllCreditCards, setShowAllCreditCards] = useState(false);
  const [searchType, setSearchType] = useState<'amount' | 'date'>('amount');
  const [searchAmount, setSearchAmount] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [isEditingReserve, setIsEditingReserve] = useState(false);
  const [editReserveValue, setEditReserveValue] = useState(reserveAmount.toString());
  const [isForecastGenerating, setIsForecastGenerating] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userConfidenceThreshold, setUserConfidenceThreshold] = useState<number>(0);
  const [showDateSearch, setShowDateSearch] = useState(false);
  const [searchedDate, setSearchedDate] = useState<Date | undefined>(undefined);
  const [dateSearchResults, setDateSearchResults] = useState<{
    projectedCash: number;
    availableCredit: number;
    expenses: number;
    income: number;
    forecastedPayouts: number;
  } | null>(null);
  const netDaily = dailyInflow - dailyOutflow;
  const healthStatus = netDaily >= 0 ? "positive" : "negative";

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
  }, [user?.id, amazonPayouts.length, isForecastGenerating]); // More specific dependencies

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
      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.account_id) {
        throw new Error('Account not found');
      }
      
      // Delete all existing forecasted payouts for this account
      // This ensures only one set of forecasts exists per account
      await supabase
        .from('amazon_payouts')
        .delete()
        .eq('account_id', profile.account_id)
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
      } catch (error) {
        // Error toast is already shown by the hook
      }
    }
  };
  const handleCancelEdit = () => {
    setEditReserveValue(reserveAmount.toString());
    setIsEditingReserve(false);
  };

  // Fetch pending purchase orders for each credit card - memoized
  const fetchPendingOrders = useCallback(async () => {
    if (!creditCards || creditCards.length === 0 || !user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) return;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('credit_card_id, amount')
      .eq('account_id', profile.account_id)
      .in('type', ['purchase_order', 'expense'])
      .eq('status', 'pending')
      .eq('archived', false)
      .not('credit_card_id', 'is', null);

    // Fetch active recurring expenses paid by credit card
    const { data: recurringExpenses } = await supabase
      .from('recurring_expenses')
      .select('credit_card_id, amount, frequency, start_date, end_date')
      .eq('account_id', profile.account_id)
      .eq('is_active', true)
      .eq('type', 'expense')
      .not('credit_card_id', 'is', null);

    const ordersByCard: Record<string, number> = {};
    
    // Add pending transactions
    if (transactions) {
      transactions.forEach(tx => {
        if (tx.credit_card_id) {
          ordersByCard[tx.credit_card_id] = (ordersByCard[tx.credit_card_id] || 0) + Number(tx.amount);
        }
      });
    }

    // Add recurring expenses (calculate occurrences in next 30 days)
    if (recurringExpenses) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = addDays(today, 30);

      recurringExpenses.forEach(recurring => {
        if (!recurring.credit_card_id) return;

        const recurringTransaction = {
          id: '',
          name: '',
          transaction_name: '',
          amount: recurring.amount,
          frequency: recurring.frequency as 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | '2-months' | '3-months' | 'weekdays',
          start_date: recurring.start_date,
          end_date: recurring.end_date,
          is_active: true,
          type: 'expense' as const
        };

        const occurrences = generateRecurringDates(recurringTransaction, today, endDate);
        const totalAmount = occurrences.length * recurring.amount;

        ordersByCard[recurring.credit_card_id] = (ordersByCard[recurring.credit_card_id] || 0) + totalAmount;
      });
    }

    setPendingOrdersByCard(ordersByCard);
  }, [creditCards?.length, user?.id]);

  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);
  
  // Calculate buying opportunities for each credit card - memoized
  const calculatedCardOpportunities = useMemo(() => {
    if (!creditCards || creditCards.length === 0) return {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const opportunitiesMap: Record<string, Array<{ date: string; availableCredit: number }>> = {};

    for (const card of creditCards) {
      const opportunities: Array<{ date: string; availableCredit: number }> = [];
      
      // Calculate effective available credit using override if set
      const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
      const effectiveAvailableCredit = effectiveCreditLimit - card.balance;
      
      // Current available credit is always the first opportunity
      opportunities.push({
        date: today.toISOString().split('T')[0],
        availableCredit: effectiveAvailableCredit
      });

      // If card has statement balance and due date, that's a buying opportunity
      if (card.statement_balance && card.statement_balance > 0 && card.payment_due_date) {
        const paymentDueDate = new Date(card.payment_due_date);
        paymentDueDate.setHours(0, 0, 0, 0);

        // Only include if due date is in the future
        if (paymentDueDate > today) {
          const newAvailableCredit = effectiveAvailableCredit + Number(card.statement_balance);
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

    return opportunitiesMap;
  }, [creditCards]);

  useEffect(() => {
    setCardOpportunities(calculatedCardOpportunities);
  }, [calculatedCardOpportunities]);

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

  // Calculate adjusted opportunities with temporary projections - memoized
  const getAdjustedOpportunities = useCallback(() => {
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
  }, [tempProjections, allBuyingOpportunities]);

  const adjustedOpportunities = useMemo(() => getAdjustedOpportunities(), [getAdjustedOpportunities]);

  // Use adjusted opportunities directly (no credit merging)
  const mergedOpportunities = adjustedOpportunities;

  const handleDateSearch = useCallback(async (date: Date) => {
    setSearchedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    
    // Calculate regular expenses for this date
    let dayExpenses = events
      .filter(e => e.type === 'expense' && e.start.split('T')[0] === dateStr)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    
    // Calculate regular income for this date
    let dayIncome = events
      .filter(e => e.type === 'income' && e.start.split('T')[0] === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Add confirmed and forecasted Amazon payouts
    let dayForecastedPayouts = 0;
    amazonPayouts.forEach(payout => {
      const isConfirmedPayout = payout.status === 'confirmed';
      const isForecastedPayout = payout.status === 'forecasted';
      
      if (isConfirmedPayout || isForecastedPayout) {
        let arrivalDateStr: string | null = null;
        
        if (isForecastedPayout) {
          // Forecasted payouts use payout_date directly
          arrivalDateStr = payout.payout_date;
        } else {
          // Confirmed payouts calculate from settlement_end_date + 1 day
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
          
          if (settlementEndStr) {
            const arrivalDate = new Date(settlementEndStr);
            arrivalDate.setDate(arrivalDate.getDate() + 1);
            arrivalDateStr = arrivalDate.toISOString().split('T')[0];
          }
        }
        
        // Add to appropriate category based on status
        if (arrivalDateStr === dateStr) {
          if (isForecastedPayout) {
            dayForecastedPayouts += Number(payout.total_amount);
          } else {
            dayIncome += Number(payout.total_amount);
          }
        }
      }
    });
    
    // Fetch recurring expenses/income for this date
    try {
      const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('is_active', true);
      
      if (recurringExpenses) {
        // Import the generateRecurringDates function
        const { generateRecurringDates } = await import('@/lib/recurringDates');
        
        recurringExpenses.forEach(recurring => {
          const occurrences = generateRecurringDates(
            {
              id: recurring.id,
              transaction_name: recurring.name,
              amount: recurring.amount,
              frequency: recurring.frequency as any,
              start_date: recurring.start_date,
              end_date: recurring.end_date,
              is_active: recurring.is_active,
              type: recurring.type as any
            },
            date,
            date
          );
          
          if (occurrences.length > 0) {
            if (recurring.type === 'expense') {
              dayExpenses += Number(recurring.amount);
            } else {
              dayIncome += Number(recurring.amount);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
    }
    
    // Find the projected balance for this date from daily_balances
    const dailyBalance = dailyBalances.find(db => db.date === dateStr);
    const projectedCash = dailyBalance?.balance || currentBalance;
    
    // Calculate available credit with per-card capping
    const totalAvailableCredit = creditCards.reduce((sum, card) => {
      const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
      const cardAvailable = effectiveCreditLimit - card.balance;
      const cardPending = pendingOrdersByCard[card.id] || 0;
      const cardNetAvailable = cardAvailable - cardPending;
      // Cap each card at 0
      return sum + Math.max(0, cardNetAvailable);
    }, 0);
    
    setDateSearchResults({
      projectedCash,
      availableCredit: totalAvailableCredit,
      expenses: dayExpenses,
      income: dayIncome,
      forecastedPayouts: dayForecastedPayouts
    });
  }, [events, amazonPayouts, allBuyingOpportunities, currentBalance, reserveAmount, creditCards]);


  return <Card className="shadow-card h-full flex flex-col bg-background/10 backdrop-blur-sm">
      <CardContent className="space-y-4 flex-1 overflow-auto pt-6 pb-6">
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
                        <p className="text-sm font-semibold mb-2">How Available to Spend Works:</p>
                        <p className="text-sm mb-2">
                          We project your balance 90 days (3 months) into the future, considering all scheduled income and expenses.
                        </p>
                        <p className="text-sm mb-2">
                          <strong>Formula:</strong><br />
                          Available to Spend = Lowest Projected Balance - Reserve
                        </p>
                        <p className="text-sm">
                          This ensures you can safely spend this amount today without going below your minimum projected balance or your reserve.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Search Date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={searchedDate}
                      onSelect={(date) => {
                        if (date) {
                          handleDateSearch(date);
                          setShowDateSearch(true);
                        }
                      }}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border-2 ${safeSpendingLimit < 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Available to Spend</span>
                      {safeSpendingLimit < 0 && <AlertCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    <span className={`text-2xl font-bold ${safeSpendingLimit < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                      ${(() => {
                        // Show cash-only safe spending
                        return safeSpendingLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    This is what you can safely spend without risking shortfalls
                  </p>
                  
                  {safeSpendingAvailableDate && safeSpendingLimit > 0 && (
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
                  
                  {lowestBalanceDate && (
                    <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border/50">
                      Lowest point in next 3 months: {(() => {
                        const [year, month, day] = lowestBalanceDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      })()}
                    </p>
                  )}
                </div>

                {/* Opportunity #2 Preview - only show if current safe spending is positive */}
                {safeSpendingLimit > 0 && mergedOpportunities.length > 1 && mergedOpportunities[1].balance > 0 && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <h5 className="font-semibold text-xs">Opportunity #2</h5>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        ${mergedOpportunities[1].balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Low Point</span>
                        <span className="font-medium">
                          {(() => {
                            const [year, month, day] = mergedOpportunities[1].date.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            });
                          })()}
                        </span>
                      </div>
                      {mergedOpportunities[1].available_date && (
                        <div className="flex items-center justify-between p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                          <span className="text-muted-foreground text-xs">Earliest Purchase Date</span>
                          <span className="font-semibold text-blue-600">
                            {(() => {
                              const [year, month, day] = mergedOpportunities[1].available_date.split('-').map(Number);
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
                      <span className="font-semibold text-blue-600">
                        -${reserveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7" 
                        onClick={() => setIsEditingReserve(true)}
                        title="Edit reserve amount"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>}
                </div>
                
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Lowest Projected Amount</span>
                  <span className="font-semibold text-blue-600">
                    ${projectedLowestBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                  
                  {allBuyingOpportunities && allBuyingOpportunities.filter(opp => opp.balance > 0).length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAllOpportunities(true)}
                    className="w-full"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View All {mergedOpportunities.filter(opp => opp.balance > 0).length} {mergedOpportunities.filter(opp => opp.balance > 0).length === 1 ? 'Opportunity' : 'Opportunities'}
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
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Total Available Credit</span>
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        ${(() => {
                          const netAvailableCredit = creditCards.reduce((sum, card) => {
                            const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
                            const cardAvailable = effectiveCreditLimit - card.balance;
                            const cardPending = pendingOrdersByCard[card.id] || 0;
                            
                            // Calculate today's credit card outflow for this specific card
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const todayCardOutflow = excludeToday ? 0 : events
                              .filter(e => {
                                const eventDate = new Date(e.date);
                                eventDate.setHours(0, 0, 0, 0);
                                return e.creditCardId === card.id &&
                                       e.type === 'outflow' && 
                                       eventDate.getTime() === today.getTime();
                              })
                              .reduce((sum, e) => sum + e.amount, 0);
                            
                            const cardNetAvailable = cardAvailable - cardPending - todayCardOutflow;
                            // Cap each card at 0
                            return sum + Math.max(0, cardNetAvailable);
                          }, 0);
                          
                          return netAvailableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        across {creditCards.length} {creditCards.length === 1 ? 'card' : 'cards'}
                      </span>
                    </div>
                    {(() => {
                      const totalPending = Object.values(pendingOrdersByCard).reduce((sum, amount) => sum + amount, 0);
                      return totalPending > 0 ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending orders
                        </p>
                      ) : null;
                    })()}
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
            </div>
          )}
        </div>
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
                  <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
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
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 mt-2">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">
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
              {mergedOpportunities.map((opp, index) => {
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
                        <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                          ${opp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {(opp as any).includesCredit && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] py-0">
                              <CreditCard className="h-3 w-3 mr-1" />
                              + Credit
                            </Badge>
                          )}
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
                        <div className="flex justify-between p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <span className="text-blue-700 dark:text-blue-400 font-medium">Earliest Purchase:</span>
                          <span className="font-bold text-blue-600">{availableDate}</span>
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
                      // Find ALL opportunities with sufficient balance
                      const matchingOpps = mergedOpportunities.filter(opp => opp.balance >= amount);
                      
                      // Sort by available_date to find the earliest one
                      const matchingOpp = matchingOpps.length > 0
                        ? matchingOpps.sort((a, b) => {
                            const dateA = new Date(a.available_date || a.date).getTime();
                            const dateB = new Date(b.available_date || b.date).getTime();
                            return dateA - dateB;
                          })[0]
                        : null;
                      
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {searchDate ? format(new Date(searchDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={searchDate ? new Date(searchDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setSearchDate(format(date, "yyyy-MM-dd"));
                        } else {
                          setSearchDate('');
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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

      {/* All Credit Cards Modal */}
      <Dialog open={showAllCreditCards} onOpenChange={setShowAllCreditCards}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              All Credit Cards
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[600px] pr-4">
              <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Available Credit</span>
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                    ${creditCards.reduce((sum, card) => {
                      const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
                      const effectiveAvailableCredit = effectiveCreditLimit - card.balance;
                      return sum + effectiveAvailableCredit;
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              
              {[...creditCards].sort((a, b) => (a.priority || 3) - (b.priority || 3)).map((card) => {
                const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
                const effectiveAvailableCredit = effectiveCreditLimit - card.balance;
                const pendingOrders = pendingOrdersByCard[card.id] || 0;
                const currentAvailableSpend = effectiveAvailableCredit - pendingOrders;
                const opportunities = cardOpportunities[card.id] || [];
                const isOverLimit = currentAvailableSpend < 0;
                
                // Priority mapping: 1 = High, 2 = Medium, 3 = Low
                const priorityLabel = card.priority === 1 ? 'High' : card.priority === 2 ? 'Medium' : 'Low';
                const priorityColor = card.priority === 1 ? 'text-green-600' : card.priority === 2 ? 'text-blue-600' : 'text-gray-600';
                
                return (
                  <div key={card.id} className={`p-3 rounded-lg space-y-2 ${isOverLimit ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-500' : 'bg-muted/50 border border-border'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{card.account_name}</p>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${priorityColor} ${card.priority === 1 ? 'bg-green-100 dark:bg-green-900/20' : card.priority === 2 ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            {priorityLabel}
                          </span>
                          {isOverLimit && <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">{card.institution_name}</p>
                        {/* Due Date & Statement Balance */}
                        <div className="flex gap-3 text-xs">
                          {card.payment_due_date && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Due: {new Date(card.payment_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {card.statement_balance > 0 && (
                            <span className="text-gray-600 dark:text-gray-400">
                              Statement: ${card.statement_balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold flex-shrink-0 ${isOverLimit ? 'text-red-600 dark:text-red-500' : 'text-green-700 dark:text-green-400'}`}>
                          ${effectiveAvailableCredit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
                      </div>
                    </div>
                    
                    {isOverLimit && (
                      <div className="flex items-start gap-1.5 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 dark:text-red-400">
                          Over limit by ${Math.abs(currentAvailableSpend).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Available to Spend Section */}
                    <div className={`p-2.5 rounded-lg border ${currentAvailableSpend < 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-green-50 dark:bg-green-950/20 border-green-500'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Available to Spend</span>
                        <span className={`text-lg font-bold ${currentAvailableSpend < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                          ${Math.max(0, currentAvailableSpend).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      {pendingOrders > 0 && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Pending Orders: ${pendingOrders.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                    
                    {/* Buying Opportunities */}
                    {opportunities.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold flex items-center gap-1">
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Buying Opportunities
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {opportunities.length} available
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {opportunities.slice(0, 2).map((opp, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs border border-blue-200 dark:border-blue-800">
                              <span className="text-muted-foreground">
                                {new Date(opp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="font-semibold text-blue-600">
                                ${opp.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                          {opportunities.length > 2 && (
                            <p className="text-xs text-center text-muted-foreground">
                              +{opportunities.length - 2} more opportunities
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col p-2 bg-background/50 rounded">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-gray-600 dark:text-gray-400">Credit Limit</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => {
                              setEditingCreditLimit(card.id);
                              setCreditLimitOverride(card.credit_limit_override?.toString() || '');
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          ${(card.credit_limit_override || card.credit_limit).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          {card.credit_limit_override && (
                            <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">*</span>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-background/50 rounded">
                        <span className="text-gray-600 dark:text-gray-400 mb-0.5">Current Balance</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">${card.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Credit Limit Override Dialog */}
      <Dialog open={editingCreditLimit !== null} onOpenChange={(open) => !open && setEditingCreditLimit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Credit Limit</DialogTitle>
            <DialogDescription>
              Set an extended credit limit for this card. Some credit cards allow purchasing power beyond the standard limit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingCreditLimit && (() => {
              const card = creditCards.find(c => c.id === editingCreditLimit);
              return card ? (
                <>
                  <div className="space-y-2">
                    <Label>Card</Label>
                    <p className="text-sm font-medium">{card.account_name}</p>
                    <p className="text-xs text-muted-foreground">Standard Limit: ${card.credit_limit.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit-limit-override">Extended Credit Limit</Label>
                    <Input
                      id="credit-limit-override"
                      type="number"
                      placeholder={card.credit_limit.toString()}
                      value={creditLimitOverride}
                      onChange={(e) => setCreditLimitOverride(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use standard limit
                    </p>
                  </div>
                </>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCreditLimit(null)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!editingCreditLimit) return;
              
              const override = creditLimitOverride ? parseFloat(creditLimitOverride) : null;
              await updateCreditCard(editingCreditLimit, { 
                credit_limit_override: override as any
              });
              setEditingCreditLimit(null);
              setCreditLimitOverride('');
              toast({ title: "Credit limit updated" });
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Search Results Dialog */}
      <Dialog open={showDateSearch} onOpenChange={setShowDateSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Financial Snapshot</DialogTitle>
            <DialogDescription>
              {searchedDate && `Financial overview for ${searchedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          {dateSearchResults && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-muted-foreground">Projected Cash</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    ${dateSearchResults.projectedCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-muted-foreground">Available Credit</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    ${dateSearchResults.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                    <span className="text-xs font-medium text-muted-foreground">Expenses</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    ${dateSearchResults.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-muted-foreground">Income</span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">
                    ${(dateSearchResults.income + dateSearchResults.forecastedPayouts).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net Change</span>
                  <span className={`text-lg font-bold ${
                    ((dateSearchResults.income + dateSearchResults.forecastedPayouts) - dateSearchResults.expenses) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {((dateSearchResults.income + dateSearchResults.forecastedPayouts) - dateSearchResults.expenses) >= 0 ? '+' : ''}
                    ${((dateSearchResults.income + dateSearchResults.forecastedPayouts) - dateSearchResults.expenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Available Funds</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${dateSearchResults.projectedCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDateSearch(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>;
});