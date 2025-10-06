import { DollarSign, CreditCard, TrendingUp, Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSafeSpending } from "@/hooks/useSafeSpending";

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

export function OverviewStats({ totalCash = 0, events = [], onUpdateCashBalance, pendingIncomeToday }: OverviewStatsProps) {
  const [incomingTimeRange, setIncomingTimeRange] = useState("7days");
  const [upcomingTimeRange, setUpcomingTimeRange] = useState("7days");
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { totalBalance: bankAccountBalance, accounts } = useBankAccounts();
  const { totalCreditLimit, totalBalance: totalCreditBalance, totalAvailableCredit } = useCreditCards();
  const { data: safeSpendingData, isLoading: isLoadingSafeSpending, updatePercentage, refetch: refetchSafeSpending } = useSafeSpending();
  
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
    
    return event.type === 'inflow' &&
           eventDate >= now && 
           eventDate <= incomingEndDate;
  });
  const incomingTotal = incomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate upcoming payments (outflows)
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
  
  return (
    <>
      <div className="grid gap-4 grid-cols-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-600">Total Projected</p>
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
                ${accounts.length === 0 ? '0' : (bankAccountBalance + (pendingIncomeToday?.amount || 0)).toLocaleString()}
              </p>
              <div className="space-y-0.5">
                <p className="text-sm text-slate-600">
                  Cash: {formatCurrency(bankAccountBalance)}
                </p>
                {pendingIncomeToday && pendingIncomeToday.amount > 0 && (
                  <p className="text-sm text-slate-600">
                    Pending: {formatCurrency(pendingIncomeToday.amount)}
                  </p>
                )}
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-slate-600">Credit Utilization</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalCreditBalance)}</p>
              <p className="text-sm text-slate-600">of {formatCurrency(totalCreditLimit)} limit</p>
              <p className="text-xs text-purple-600">{formatCurrency(totalAvailableCredit)} available • {creditUtilization.toFixed(1)}% used</p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
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
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-6">
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
              <p className="text-xs text-amber-600">
                {timeRangeOptions.find(opt => opt.value === upcomingTimeRange)?.label}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Safe Spending Limit</p>
                <Select 
                  value={safeSpendingData?.percentage?.toString() || "20"} 
                  onValueChange={(value) => updatePercentage(parseInt(value))}
                >
                  <SelectTrigger className="w-20 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70].map((pct) => (
                      <SelectItem key={pct} value={pct.toString()}>
                        {pct}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLoadingSafeSpending ? (
                <div className="space-y-2">
                  <div className="h-8 w-32 bg-indigo-200 animate-pulse rounded"></div>
                  <div className="h-4 w-24 bg-indigo-100 animate-pulse rounded"></div>
                </div>
              ) : safeSpendingData ? (
                <>
                  <p className="text-2xl font-bold text-indigo-700">
                    {formatCurrency(safeSpendingData.safe_daily_limit)}<span className="text-sm font-normal">/day</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatCurrency(safeSpendingData.total_180day_limit)} for 180 days
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    {safeSpendingData.percentage}% of current balance
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Unable to calculate</p>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-500" />
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
    </>
  );
}