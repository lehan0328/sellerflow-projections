import { DollarSign, CreditCard, TrendingUp, Calendar, AlertTriangle, RefreshCw, CheckCircle, ShoppingCart, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSafeSpending } from "@/hooks/useSafeSpending";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { OverdueTransactionsModal } from "./overdue-transactions-modal";

interface OverviewStatsProps {
  totalCash?: number;
  events?: Array<{
    type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
    amount: number;
    date: Date;
  }>;
  onUpdateCashBalance?: () => void;
  pendingIncomeToday?: {
    amount: number;
    count: number;
  };
}

const timeRangeOptions = [
  { value: "today", label: "Today", days: 0 },
  { value: "3days", label: "3 Days", days: 3 },
  { value: "7days", label: "7 Days", days: 7 },
  { value: "14days", label: "14 Days", days: 14 },
  { value: "30days", label: "30 Days", days: 30 },
  { value: "60days", label: "60 Days", days: 60 },
  { value: "90days", label: "90 Days", days: 90 },
];

const amazonTimeRangeOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "mtd", label: "Month to Date" },
  { value: "last30", label: "Last 30 Days" },
  { value: "lastmonth", label: "Last Month" },
];

export function OverviewStats({ totalCash = 0, events = [], onUpdateCashBalance, pendingIncomeToday }: OverviewStatsProps) {
  const [incomingTimeRange, setIncomingTimeRange] = useState(() => {
    return localStorage.getItem('incomingTimeRange') || "7days";
  });
  const [upcomingTimeRange, setUpcomingTimeRange] = useState(() => {
    return localStorage.getItem('upcomingTimeRange') || "7days";
  });
  const [amazonTimeRange, setAmazonTimeRange] = useState(() => {
    return localStorage.getItem('amazonTimeRange') || "mtd";
  });
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  
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
  
  const { totalBalance: bankAccountBalance, accounts } = useBankAccounts();
  const { totalCreditLimit, totalBalance: totalCreditBalance, totalAvailableCredit } = useCreditCards();
  const { data: safeSpendingData, isLoading: isLoadingSafeSpending, updateReserveAmount, refetch: refetchSafeSpending } = useSafeSpending();
  const { amazonPayouts, monthlyOrdersTotal } = useAmazonPayouts();
  const { transactions: vendorTransactions } = useVendorTransactions();
  const { incomeItems } = useIncome();
  const [reserveInput, setReserveInput] = useState<string>("");
  
  // Force fresh calculation on mount
  useEffect(() => {
    console.log('🔄 OverviewStats mounted - fetching safe spending data');
    refetchSafeSpending();
  }, []);
  
  // Calculate dynamic values based on events
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  
  // Check if balances match (within $1 tolerance)
  const balanceMatches = Math.abs(totalCash - bankAccountBalance) < 1.00;
  const balanceDifference = Math.abs(totalCash - bankAccountBalance);

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
    const isRecurringExpense = event.type === 'outflow' && 
      (typeof (event as any).id === 'string' && (event as any).id.startsWith('recurring-'));
    
    return event.type === 'inflow' &&
           !isRecurringExpense &&
           eventDate >= now && 
           eventDate <= incomingEndDate;
  });
  const incomingTotal = incomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate upcoming payments (outflows including recurring expenses)
  const upcomingEndDate = getEndDate(upcomingTimeRange);
  const upcomingPayments = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0); // Start of event day
    
    return (event.type === 'outflow' || event.type === 'purchase-order' || event.type === 'credit-payment') &&
           eventDate >= now && 
           eventDate <= upcomingEndDate;
  });
  const upcomingTotal = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate credit utilization
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0;
  
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
  let tpcRunning = bankAccountBalance;
  for (const e of sortedEvents) {
    const k = keyFor(e.date);
    if (k <= todayKey) {
      tpcRunning += (e.type === 'inflow' ? e.amount : -e.amount);
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
  let tpcFirstNegativeDay: { date: string; balance: number } | null = null;
  let tpcFirstBelowLimitDay: { date: string; balance: number } | null = null;
  const ssl = safeSpendingData?.safe_spending_limit ?? 0;

  let tpcCursor = tpcRunning;
  for (const k of futureKeys) {
    tpcCursor += dayMap.get(k)!;
    if (!tpcFirstNegativeDay && tpcCursor < 0) {
      tpcFirstNegativeDay = { date: k, balance: tpcCursor };
    }
    if (!tpcFirstBelowLimitDay && tpcCursor < ssl) {
      tpcFirstBelowLimitDay = { date: k, balance: tpcCursor };
    }
  }

  const displayNegative = tpcFirstNegativeDay;
  const displayBelow = !displayNegative ? tpcFirstBelowLimitDay : null;

  const formatDateKey = (k: string) => new Date(`${k}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isBreach = Boolean(displayNegative || displayBelow);

  // Calculate Amazon revenue based on selected time range
  const getAmazonDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (amazonTimeRange) {
      case "today":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday,
          end: today
        };
      case "mtd":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
      case "last30":
        const last30Start = new Date(today);
        last30Start.setDate(last30Start.getDate() - 30);
        return {
          start: last30Start,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case "lastmonth":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: lastMonth,
          end: lastMonthEnd
        };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
    }
  };

  const amazonDateRange = getAmazonDateRange();
  const filteredAmazonRevenue = amazonPayouts
    .filter(payout => {
      const payoutDate = new Date(payout.payout_date);
      return payoutDate >= amazonDateRange.start && payoutDate < amazonDateRange.end;
    })
    .reduce((sum, payout) => sum + (payout.orders_total || 0), 0);

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

  const totalOverdueCount = overdueVendorCount + overdueIncomeCount;

  return (<>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-600">Cash</p>
                {!balanceMatches && accounts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncRequest}
                    disabled={isSyncing}
                    className="h-6 w-6 p-0 text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                    title={`Bank balance differs by ${formatCurrency(balanceDifference)}. Click to sync.`}
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(bankAccountBalance)}
              </p>
              <div className="space-y-0.5">
                {pendingIncomeToday && pendingIncomeToday.amount > 0 && (
                  <p className="text-sm text-slate-600">
                    Pending: {formatCurrency(pendingIncomeToday.amount)}
                  </p>
                )}
                <p className="text-sm text-slate-600">
                  Total Projected: {formatCurrency(accounts.length === 0 ? 0 : (bankAccountBalance + (pendingIncomeToday?.amount || 0)))}
                </p>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-slate-600">Available Credit</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalAvailableCredit)}</p>
              <p className="text-sm text-slate-600">of {formatCurrency(totalCreditLimit)} limit</p>
              <p className="text-xs text-purple-600">{formatCurrency(totalCreditBalance)} used • {creditUtilization.toFixed(1)}% utilization</p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Incoming $</p>
                <Select value={incomingTimeRange} onValueChange={setIncomingTimeRange}>
                  <SelectTrigger className="w-32 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(incomingTotal)}</p>
              <p className="text-sm text-slate-600">
                {incomingPayments.length > 0 ? `${incomingPayments.length} Amazon payouts & income` : "No Amazon payouts or income"}
              </p>
              <p className="text-xs text-green-600">
                {timeRangeOptions.find(opt => opt.value === incomingTimeRange)?.label}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Upcoming Payments</p>
                <Select value={upcomingTimeRange} onValueChange={setUpcomingTimeRange}>
                  <SelectTrigger className="w-32 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(upcomingTotal)}</p>
              <p className="text-sm text-slate-600">
                {upcomingPayments.length > 0 ? `${upcomingPayments.length} payments due` : "No payments due"}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-amber-600">
                  {timeRangeOptions.find(opt => opt.value === upcomingTimeRange)?.label}
                </p>
                {totalOverdueCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOverdueModal(true)}
                    className="h-7 px-2 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                      {totalOverdueCount}
                    </Badge>
                  </Button>
                )}
              </div>
            </div>
            <Calendar className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Amazon Revenue</p>
                <Select value={amazonTimeRange} onValueChange={setAmazonTimeRange}>
                  <SelectTrigger className="w-32 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {amazonTimeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(filteredAmazonRevenue)}</p>
              <p className="text-sm text-slate-600">
                Orders total
              </p>
              <p className="text-xs text-orange-600">
                {amazonTimeRangeOptions.find(opt => opt.value === amazonTimeRange)?.label}
              </p>
            </div>
            <ShoppingCart className="h-8 w-8 text-orange-500" />
          </div>
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
      <OverdueTransactionsModal 
        open={showOverdueModal} 
        onOpenChange={setShowOverdueModal} 
      />
    </>
  );
}