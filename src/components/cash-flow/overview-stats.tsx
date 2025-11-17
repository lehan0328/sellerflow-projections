import { DollarSign, CreditCard, TrendingUp, Calendar, AlertTriangle, RefreshCw, CheckCircle, ShoppingCart, AlertCircle, XCircle, Eye } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSafeSpending } from "@/hooks/useSafeSpending";
import { useReserveAmount } from "@/hooks/useReserveAmount";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { useExcludeToday } from "@/contexts/ExcludeTodayContext";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { generateRecurringDates } from "@/lib/recurringDates";
import { OverdueTransactionsModal } from "./overdue-transactions-modal";
import { TransactionsListModal } from "./transactions-list-modal";
import { formatCurrency } from "@/lib/utils";
interface OverviewStatsProps {
  totalCash?: number;
  events?: Array<{
    type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
    amount: number;
    date: Date;
  }>;
  onUpdateCashBalance?: () => void;
  onTransactionUpdate?: () => void;
  pendingIncomeToday?: {
    amount: number;
    count: number;
  };
}
const timeRangeOptions = [{
  value: "today",
  label: "Today",
  days: 0
}, {
  value: "3days",
  label: "3 Days",
  days: 3
}, {
  value: "7days",
  label: "7 Days",
  days: 7
}, {
  value: "14days",
  label: "14 Days",
  days: 14
}, {
  value: "30days",
  label: "30 Days",
  days: 30
}, {
  value: "60days",
  label: "60 Days",
  days: 60
}, {
  value: "90days",
  label: "90 Days",
  days: 90
}];
const amazonTimeRangeOptions = [{
  value: "next30",
  label: "Next 30 Days (Projected)"
}, {
  value: "next60",
  label: "Next 60 Days (Projected)"
}, {
  value: "next90",
  label: "Next 90 Days (Projected)"
}];
export function OverviewStats({
  totalCash = 0,
  events = [],
  onUpdateCashBalance,
  onTransactionUpdate,
  pendingIncomeToday,
  useAvailableBalance
}: OverviewStatsProps & {
  useAvailableBalance?: boolean;
}) {
  const [incomingTimeRange, setIncomingTimeRange] = useState(() => {
    return localStorage.getItem('incomingTimeRange') || "3days";
  });
  const [upcomingTimeRange, setUpcomingTimeRange] = useState(() => {
    return localStorage.getItem('upcomingTimeRange') || "3days";
  });
  const [amazonTimeRange, setAmazonTimeRange] = useState(() => {
    return localStorage.getItem('amazonTimeRange') || "next30";
  });
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);
  const [showCreditCardsModal, setShowCreditCardsModal] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);

  // Save selections to localStorage
  useEffect(() => {
    localStorage.setItem('incomingTimeRange', incomingTimeRange);
  }, [incomingTimeRange]);
  useEffect(() => {
    localStorage.setItem('upcomingTimeRange', upcomingTimeRange);
  }, [upcomingTimeRange]);
  useEffect(() => {
    localStorage.setItem('amazonTimeRange', amazonTimeRange);
  }, [amazonTimeRange]);
  const {
    totalBalance: bankAccountBalance,
    accounts
  } = useBankAccounts();

  // Calculate available balance total
  const totalAvailableBalance = accounts.reduce((sum, account) => {
    return sum + (account.available_balance ?? account.balance);
  }, 0);

  // Use toggled balance type
  const displayBankBalance = useAvailableBalance ? totalAvailableBalance : bankAccountBalance;
  const {
    creditCards,
    totalCreditLimit,
    totalBalance: totalCreditBalance,
    totalAvailableCredit
  } = useCreditCards();
  const {
    reserveAmount,
    updateReserveAmount: updateReserve,
    canUpdate,
    lastUpdated
  } = useReserveAmount();
  const {
    excludeToday,
    setExcludeToday
  } = useExcludeToday();
  const {
    data: safeSpendingData,
    isLoading: isLoadingSafeSpending,
    refetch: refetchSafeSpending
  } = useSafeSpending(reserveAmount, excludeToday, useAvailableBalance);
  const {
    amazonPayouts,
    monthlyOrdersTotal
  } = useAmazonPayouts();
  const {
    transactions: vendorTransactions
  } = useVendorTransactions();
  const {
    incomeItems
  } = useIncome();
  const {
    recurringExpenses
  } = useRecurringExpenses();
  const [reserveInput, setReserveInput] = useState<string>("");

  // Calculate today's income and expenses (including recurring)
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayStr = todayDate.toDateString();

  // Amazon payouts that become available today (confirmed payouts with settlement_end_date + 1 day = today)
  const todayStrISO = todayDate.toISOString().split('T')[0];
  const amazonIncomeToday = amazonPayouts.filter(payout => {
    if (payout.status !== 'confirmed') return false;

    // For confirmed payouts, funds are available on settlement_end_date (no extra day)
    const rawData = (payout as any).raw_settlement_data;
    const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
    if (settlementEndStr) {
      const fundsAvailableDate = new Date(settlementEndStr);
      // No extra day added for confirmed payouts
      const availableDateStr = fundsAvailableDate.toISOString().split('T')[0];
      return availableDateStr === todayStrISO;
    }
    return false;
  }).reduce((sum, payout) => sum + payout.total_amount, 0);

  // Regular income
  const regularIncome = incomeItems.filter(item => {
    const itemDate = new Date(item.paymentDate);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.toDateString() === todayStr && item.status !== 'received';
  }).reduce((sum, item) => sum + item.amount, 0);

  // Recurring income that occurs today
  const recurringIncome = recurringExpenses.filter(exp => exp.type === 'income' && exp.is_active).reduce((sum, exp) => {
    const dates = generateRecurringDates({
      id: exp.id,
      transaction_name: exp.transaction_name || exp.name,
      amount: exp.amount,
      frequency: exp.frequency,
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_active: exp.is_active,
      type: exp.type
    }, todayDate, todayDate);
    return dates.length > 0 ? sum + exp.amount : sum;
  }, 0);
  const todaysIncome = regularIncome + recurringIncome + amazonIncomeToday;

  // Regular expenses (vendor transactions) - based on due date
  const regularExpenses = vendorTransactions.filter(tx => {
    const txDate = new Date(tx.dueDate);
    txDate.setHours(0, 0, 0, 0);
    return txDate.toDateString() === todayStr && tx.status === 'pending';
  }).reduce((sum, tx) => sum + tx.amount, 0);

  // One-time expenses from income table
  const oneTimeExpenses = incomeItems.filter(item => {
    const itemDate = new Date(item.paymentDate);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.toDateString() === todayStr && item.status === 'pending' && (item as any).type === 'expense';
  }).reduce((sum, item) => sum + item.amount, 0);

  // Recurring expenses that occur today
  const recurringExpensesToday = recurringExpenses.filter(exp => exp.type === 'expense' && exp.is_active).reduce((sum, exp) => {
    const dates = generateRecurringDates({
      id: exp.id,
      transaction_name: exp.transaction_name || exp.name,
      amount: exp.amount,
      frequency: exp.frequency,
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_active: exp.is_active,
      type: exp.type
    }, todayDate, todayDate);
    return dates.length > 0 ? sum + exp.amount : sum;
  }, 0);
  const todaysExpenses = regularExpenses + oneTimeExpenses + recurringExpensesToday;

  // Calculate hours until next update is allowed
  const hoursUntilNextUpdate = lastUpdated && !canUpdate ? Math.ceil(24 - (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60)) : 0;

  // Force fresh calculation on mount
  useEffect(() => {
    refetchSafeSpending();
  }, []);

  // Refetch when exclude today changes
  useEffect(() => {
    refetchSafeSpending();
  }, [excludeToday]);

  // Check if balances match (within $1 tolerance)
  const balanceMatches = Math.abs(totalCash - displayBankBalance) < 1.00;
  const balanceDifference = Math.abs(totalCash - displayBankBalance);
  const handleSyncRequest = () => {
    if (accounts.length === 0) {
      toast.error("No bank accounts connected. Please connect your accounts first.");
      return;
    }
    setShowSyncDialog(true);
  };
  const handleConfirmSync = async () => {
    setIsSyncing(true);
    setShowSyncDialog(false);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (onUpdateCashBalance) {
        onUpdateCashBalance();
      }
      toast.success(`Cash balance synced with bank accounts: ${formatCurrency(bankAccountBalance)}`);
    } catch (error) {
      toast.error("Failed to sync with bank accounts");
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper function to get end date based on time range
  const getEndDate = (timeRange: string) => {
    const option = timeRangeOptions.find(opt => opt.value === timeRange);
    const days = option?.days || 7;
    const endDate = new Date();
    if (days === 0) {
      // For "today", set to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate.setDate(endDate.getDate() + days);
    }
    return endDate;
  };

  // Calculate incoming payments (inflow events including Amazon payouts and additional income)
  const incomingEndDate = getEndDate(incomingTimeRange);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  const incomingPayments = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0); // Start of event day

    // Exclude recurring expenses from incoming (they should be in outflows)
    const isRecurringExpense = event.type === 'outflow' && typeof (event as any).id === 'string' && (event as any).id.startsWith('recurring-');
    return event.type === 'inflow' && !isRecurringExpense && eventDate >= now && eventDate <= incomingEndDate;
  });
  const incomingTotal = incomingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate upcoming payments (outflows including recurring expenses)
  const upcomingEndDate = getEndDate(upcomingTimeRange);
  const upcomingPayments = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0); // Start of event day

    return (event.type === 'outflow' || event.type === 'purchase-order' || event.type === 'credit-payment') && eventDate >= now && eventDate <= upcomingEndDate;
  });
  const upcomingTotal = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate pending credit card transactions (future purchases)
  const pendingCreditPurchases = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return (event as any).creditCardId && eventDate >= now;
  });
  const pendingCreditTotal = pendingCreditPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  // Calculate net available credit after pending purchases
  const netAvailableCredit = totalAvailableCredit - pendingCreditTotal;

  // Calculate credit utilization (totalCreditLimit already uses credit_limit_override from hook)
  const creditUtilization = totalCreditLimit > 0 ? totalCreditBalance / totalCreditLimit * 100 : 0;
  const getCreditVariant = () => {
    if (creditUtilization >= 90) return "danger";
    if (creditUtilization >= 70) return "warning";
    return "positive";
  };

  // Calculate net (incoming - upcoming)
  const netAmount = incomingTotal - upcomingTotal;

  // Projected cash (TPC) breach detection aligned with calendar events
  const keyFor = (d: Date) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayKey = keyFor(new Date());
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Start from bank balance + all events occurring today or earlier
  let tpcRunning = displayBankBalance; // Use the toggled balance (available or current)
  for (const e of sortedEvents) {
    const k = keyFor(e.date);
    if (k <= todayKey) {
      tpcRunning += e.type === 'inflow' ? e.amount : -e.amount;
    }
  }

  // Group future events by day
  const dayMap = new Map<string, number>();
  for (const e of sortedEvents) {
    const k = keyFor(e.date);
    if (k > todayKey) {
      dayMap.set(k, (dayMap.get(k) || 0) + (e.type === 'inflow' ? e.amount : -e.amount));
    }
  }
  const futureKeys = Array.from(dayMap.keys()).sort();
  let tpcFirstNegativeDay: {
    date: string;
    balance: number;
  } | null = null;
  let tpcFirstBelowLimitDay: {
    date: string;
    balance: number;
  } | null = null;
  const ssl = safeSpendingData?.safe_spending_limit ?? 0;
  let tpcCursor = tpcRunning;
  for (const k of futureKeys) {
    tpcCursor += dayMap.get(k)!;
    if (!tpcFirstNegativeDay && tpcCursor < 0) {
      tpcFirstNegativeDay = {
        date: k,
        balance: tpcCursor
      };
    }
    if (!tpcFirstBelowLimitDay && tpcCursor < ssl) {
      tpcFirstBelowLimitDay = {
        date: k,
        balance: tpcCursor
      };
    }
  }
  const displayNegative = tpcFirstNegativeDay;
  const displayBelow = !displayNegative ? tpcFirstBelowLimitDay : null;
  const formatDateKey = (k: string) => new Date(`${k}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const isBreach = Boolean(displayNegative || displayBelow);

  // Calculate Amazon projected payouts based on selected time range
  const getAmazonDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (amazonTimeRange) {
      case "next30":
        const next30End = new Date(today);
        next30End.setDate(next30End.getDate() + 30);
        return {
          start: today,
          end: next30End
        };
      case "next60":
        const next60End = new Date(today);
        next60End.setDate(next60End.getDate() + 60);
        return {
          start: today,
          end: next60End
        };
      case "next90":
        const next90End = new Date(today);
        next90End.setDate(next90End.getDate() + 90);
        return {
          start: today,
          end: next90End
        };
      default:
        const defaultEnd = new Date(today);
        defaultEnd.setDate(defaultEnd.getDate() + 30);
        return {
          start: today,
          end: defaultEnd
        };
    }
  };
  const amazonDateRange = getAmazonDateRange();
  const filteredPayouts = amazonPayouts.filter(payout => {
    // Only include forecasted payouts (not estimated settlements or past confirmed)
    if (payout.status !== 'forecasted') {
      return false;
    }
    const payoutDate = new Date(payout.payout_date);
    payoutDate.setHours(0, 0, 0, 0);
    return payoutDate >= amazonDateRange.start && payoutDate < amazonDateRange.end;
  });
  const filteredAmazonRevenue = filteredPayouts.reduce((sum, payout) => sum + (payout.total_amount || 0), 0);

  // Calculate overdue transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueVendorCount = vendorTransactions.filter(tx => {
    const dueDate = new Date(tx.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return tx.status === 'pending' && dueDate < today;
  }).length;
  const overdueIncomeCount = incomeItems.filter(income => {
    const paymentDate = new Date(income.paymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    return income.status === 'pending' && paymentDate < today;
  }).length;

  // Calculate overdue credit card transactions
  const overdueCreditCardCount = vendorTransactions.filter(tx => {
    const dueDate = new Date(tx.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return tx.status === 'pending' && dueDate < today && tx.creditCardId;
  }).length;
  const totalOverdueCount = overdueVendorCount + overdueIncomeCount;
  return <div className="p-5 pb-6 h-full overflow-y-auto flex flex-col border border-border rounded-lg bg-background/10 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-foreground mb-4">Overview</h2>
      <div className="space-y-6 flex-1">
        {/* Today's Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Today's Activity</p>
            <div className="flex items-center gap-2">
              <Label htmlFor="exclude-today-stats" className="text-xs cursor-pointer text-muted-foreground">
                Exclude Today
              </Label>
              <Switch id="exclude-today-stats" checked={excludeToday} onCheckedChange={setExcludeToday} className="scale-75" />
              <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setShowTodayModal(true)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Inflow</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(todaysIncome)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Outflow</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(todaysExpenses)}</p>
              </div>
            </div>
            <div className="text-center pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Net</p>
              <p className={`text-lg font-bold ${todaysIncome - todaysExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(todaysIncome - todaysExpenses)}
              </p>
            </div>
          </div>
        </div>

        {/* Cash & Credit - Side by Side */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          {/* Cash */}
          <div className="border-r border-border pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-sm font-medium text-muted-foreground">Cash</p>
              {!balanceMatches && accounts.length > 0 && <Button variant="ghost" size="sm" onClick={handleSyncRequest} disabled={isSyncing} className="h-4 w-4 p-0 text-orange-400 hover:text-orange-600" title={`Bank balance differs by ${formatCurrency(balanceDifference)}. Click to sync.`}>
                  {isSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                </Button>}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1.5 text-center">
              {formatCurrency(displayBankBalance)}
            </p>
            <p className="text-sm text-muted-foreground mb-2 text-center">
              {accounts.length === 0 ? 'No accounts connected' : useAvailableBalance ? 'Available balance' : 'Current balance'}
            </p>
            {totalOverdueCount > 0 && <Button variant="outline" size="sm" onClick={() => setShowOverdueModal(true)} className="mb-1.5 h-7 px-2 text-xs border-destructive text-destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue ({totalOverdueCount})
              </Button>}
            {accounts.length > 0 && <Button variant="link" size="sm" onClick={() => setShowBankAccountsModal(true)} className="h-6 px-0 text-xs mx-auto block">
                View {accounts.length} account{accounts.length !== 1 ? 's' : ''}
              </Button>}
          </div>

          {/* Available Credit */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Available Credit</p>
            <p className="text-2xl font-bold text-foreground mb-1.5 text-center">{formatCurrency(netAvailableCredit)}</p>
            {totalCreditLimit === 0 ? <p className="text-sm text-muted-foreground italic text-center">No credit cards linked</p> : <>
                <p className="text-sm text-muted-foreground text-center mb-1">Pending: {formatCurrency(pendingCreditTotal)}</p>
                <p className="text-sm text-muted-foreground mb-2 text-center">{creditUtilization.toFixed(1)}% utilization</p>
              </>}
            {overdueCreditCardCount > 0 && <Button variant="outline" size="sm" onClick={() => setShowOverdueModal(true)} className="mb-1.5 h-7 px-2 text-xs border-destructive text-destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue ({overdueCreditCardCount})
              </Button>}
            {creditCards.length > 0 && <Button variant="link" size="sm" onClick={() => setShowCreditCardsModal(true)} className="h-6 px-0 text-xs mx-auto block">
                View {creditCards.length} card{creditCards.length !== 1 ? 's' : ''}
              </Button>}
          </div>
        </div>

        {/* Incoming & Upcoming - Stacked */}
        <div className="space-y-4 border-t pt-4">
          {/* Incoming $ */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Incoming $</p>
                {incomingPayments.length > 0 && <Button variant="link" size="sm" onClick={() => setShowIncomingModal(true)} className="h-6 px-0 text-xs">
                    View all
                  </Button>}
              </div>
              <Select value={incomingTimeRange} onValueChange={setIncomingTimeRange}>
                <SelectTrigger className="w-28 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1.5 text-center">{formatCurrency(incomingTotal)}</p>
            <p className="text-sm text-muted-foreground text-center">
              {incomingPayments.length > 0 ? `${incomingPayments.length} Amazon payouts & income` : "No income"}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 my-4" />

          {/* Upcoming Payments */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Upcoming Payments</p>
                {upcomingPayments.length > 0 && <Button variant="link" size="sm" onClick={() => setShowUpcomingModal(true)} className="h-6 px-0 text-xs">
                    View all
                  </Button>}
              </div>
              <Select value={upcomingTimeRange} onValueChange={setUpcomingTimeRange}>
                <SelectTrigger className="w-28 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1.5 text-center">{formatCurrency(upcomingTotal)}</p>
            <p className="text-sm text-muted-foreground text-center">
              {upcomingPayments.length > 0 ? `${upcomingPayments.length} payments due` : "No payments"}
            </p>
          </div>
        </div>

        {/* Weekly Cash Change */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">Weekly Cash Change</p>
          <p className="text-2xl font-bold mb-1 text-center">
                {(() => {
            // Calculate lowest balance for this week (days 0-7) vs next week (days 8-14)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisWeekEnd = new Date(today);
            thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
            const nextWeekEnd = new Date(today);
            nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

            // Get projected balances from safe spending calculation
            const dailyBalances = safeSpendingData?.calculation?.daily_balances || [];

            // Find lowest balance this week (next 7 days)
            const thisWeekBalances = dailyBalances.filter((day: any) => {
              const dayDate = new Date(day.date + 'T00:00:00');
              return dayDate >= today && dayDate < thisWeekEnd;
            });

            // Find lowest balance next week (days 8-14)
            const nextWeekBalances = dailyBalances.filter((day: any) => {
              const dayDate = new Date(day.date + 'T00:00:00');
              return dayDate >= thisWeekEnd && dayDate < nextWeekEnd;
            });
            const thisWeekLowest = thisWeekBalances.length > 0 ? Math.min(...thisWeekBalances.map((d: any) => d.balance)) : bankAccountBalance;
            const nextWeekLowest = nextWeekBalances.length > 0 ? Math.min(...nextWeekBalances.map((d: any) => d.balance)) : thisWeekLowest;
            const weeklyChange = nextWeekLowest - thisWeekLowest;
            const isPositive = weeklyChange >= 0;
            return <span className={isPositive ? "text-emerald-700" : "text-rose-700"}>
                  {isPositive ? "+" : ""}{formatCurrency(weeklyChange)}
                </span>;
          })()}
          </p>
          <p className="text-sm text-muted-foreground mb-0.5 text-center">Next week vs. This week</p>
          <p className="text-xs text-muted-foreground text-center">Projected change in lowest balance</p>
        </div>
      </div>
      
      {/* Sync Confirmation Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Cash Balance with Bank Accounts</DialogTitle>
            <DialogDescription>
              Your current cash balance ({formatCurrency(totalCash)}) doesn't match your connected bank accounts balance ({formatCurrency(bankAccountBalance)}).
              <br /><br />
              <strong>Difference:</strong> {formatCurrency(balanceDifference)}
              <br />
              <strong>Connected accounts:</strong> {accounts.length} account{accounts.length !== 1 ? 's' : ''}
              <br /><br />
              Would you like to update your cash balance to match your bank accounts?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSync}>
              Yes, Sync with Bank Accounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overdue Transactions Modal */}
      <OverdueTransactionsModal open={showOverdueModal} onOpenChange={setShowOverdueModal} onUpdate={onTransactionUpdate} />

      {/* Incoming Transactions Modal */}
      <TransactionsListModal open={showIncomingModal} onOpenChange={setShowIncomingModal} transactions={incomingPayments as any} title={`Incoming Transactions (${timeRangeOptions.find(opt => opt.value === incomingTimeRange)?.label})`} type="incoming" />

      {/* Upcoming Payments Modal */}
      <TransactionsListModal open={showUpcomingModal} onOpenChange={setShowUpcomingModal} transactions={upcomingPayments as any} title={`Upcoming Payments (${timeRangeOptions.find(opt => opt.value === upcomingTimeRange)?.label})`} type="upcoming" />

      {/* Today's Transactions Modal */}
      <TransactionsListModal open={showTodayModal} onOpenChange={setShowTodayModal} transactions={events.filter(event => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Use balanceImpactDate if it exists (for forecasted payouts with T+1),
      // otherwise use the regular date
      const effectiveDate = (event as any).balanceImpactDate || event.date;
      const eventDate = new Date(effectiveDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    }) as any} title="Today's Transactions" type="incoming" />

      {/* Bank Accounts Modal */}
      <Dialog open={showBankAccountsModal} onOpenChange={setShowBankAccountsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bank Accounts</DialogTitle>
            <DialogDescription>
              View all your connected bank accounts and their balances
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {accounts.map(account => <div key={account.id} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base">{account.account_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {account.account_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{account.institution_name}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Balance:</span>
                        <span className="text-lg font-semibold">{formatCurrency(account.balance)}</span>
                      </div>
                      {account.available_balance !== null && account.available_balance !== account.balance && <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Available:</span>
                          <span className="text-base font-medium text-green-600">{formatCurrency(account.available_balance)}</span>
                        </div>}
                    </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-green-500 ml-4" />
                </div>
              </div>)}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Balance:</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(bankAccountBalance)}</span>
              </div>
              {totalAvailableBalance !== bankAccountBalance && <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold">Total Available:</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(totalAvailableBalance)}</span>
                </div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Cards Modal */}
      <Dialog open={showCreditCardsModal} onOpenChange={setShowCreditCardsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Cards</DialogTitle>
            <DialogDescription>
              View all your connected credit cards and available credit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {creditCards.map(card => {
            const utilization = card.credit_limit > 0 ? card.balance / card.credit_limit * 100 : 0;
            return <div key={card.id} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base">{card.account_name}</h4>
                        {card.priority && <Badge variant="secondary" className="text-xs">
                            Priority {card.priority}
                          </Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{card.institution_name}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Available Credit:</span>
                          <span className="text-lg font-semibold text-purple-600">{formatCurrency(card.available_credit)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Credit Limit:</span>
                          <span className="text-base">{formatCurrency(card.credit_limit)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Balance:</span>
                          <span className="text-base text-red-600">{formatCurrency(card.balance)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Utilization:</span>
                          <span className={`text-sm font-medium ${utilization > 30 ? 'text-red-600' : 'text-green-600'}`}>
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <CreditCard className="h-6 w-6 text-purple-500 ml-4" />
                  </div>
                </div>;
          })}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Credit Limit:</span>
                <span className="text-xl font-bold">{formatCurrency(totalCreditLimit)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold">Total Available:</span>
                <span className="text-2xl font-bold text-purple-600">{formatCurrency(totalAvailableCredit)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold">Total Balance:</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(totalCreditBalance)}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}