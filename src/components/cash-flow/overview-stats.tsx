import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, CreditCard, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { useState } from "react";

// Credit card data (matching credit-cards.tsx)
const creditCards = [
  {
    id: "1",
    name: "Bank of America CORP Account - Business Adv Unlimited Cash Rewards",
    accountNumber: "2678",
    balance: 1893.22,
    limit: 4500.00,
    availableCredit: 2606.78,
    priority: 1,
    paymentDue: "4th of the month",
    statementClose: "8th of the month",
  },
  {
    id: "2",
    name: "American Express Blue Business Plus Card",
    accountNumber: "6008",
    balance: 13049.91,
    limit: 13000.00,
    availableCredit: -49.91,
    priority: 1,
    paymentDue: "7th of the month",
    statementClose: "13th of the month",
  },
  {
    id: "3",
    name: "American Express Business Gold Card",
    accountNumber: "1002",
    balance: 7098.73,
    limit: 4200.00,
    availableCredit: 0,
    priority: 2,
    paymentDue: "12th of the month",
    statementClose: "14th of the month",
  },
];

interface OverviewStatsProps {
  totalCash?: number;
  events?: Array<{
    type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
    amount: number;
    date: Date;
  }>;
  onUpdateCashBalance?: () => void;
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

export function OverviewStats({ totalCash = 0, events = [], onUpdateCashBalance }: OverviewStatsProps) {
  console.log("OverviewStats render - totalCash:", totalCash);
  
  const [incomingTimeRange, setIncomingTimeRange] = useState("7days");
  const [upcomingTimeRange, setUpcomingTimeRange] = useState("7days");
  
  // Calculate dynamic values based on events
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  
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
  const incomingPayments = events.filter(event => 
    event.type === 'inflow' &&
    event.date >= new Date() && 
    event.date <= incomingEndDate
  );
  const incomingTotal = incomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate upcoming payments (outflows)
  const upcomingEndDate = getEndDate(upcomingTimeRange);
  const upcomingPayments = events.filter(event => 
    (event.type === 'outflow' || event.type === 'purchase-order' || event.type === 'credit-payment') &&
    event.date >= new Date() && 
    event.date <= upcomingEndDate
  );
  const upcomingTotal = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Bank account balance (from bank-accounts.tsx sample data)
  const bankAccountBalance = 14269.39 + 4.29; // Total from Bank of America + Bluevine
  const balanceMatches = Math.abs(totalCash - bankAccountBalance) < 0.01;
  
  // Calculate credit card totals
  const totalCreditBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.limit, 0);
  const totalAvailableCredit = creditCards.reduce((sum, card) => sum + Math.max(0, card.limit - card.balance), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0;
  
  const getCreditVariant = () => {
    if (creditUtilization >= 90) return "danger";
    if (creditUtilization >= 70) return "warning";
    return "positive";
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-600">Total Available Cash</p>
              {!balanceMatches && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUpdateCashBalance}
                  className="h-6 w-6 p-0 text-orange-400 hover:text-orange-600"
                  title={`The cash available does not match your synced bank account. Do you want to update?`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-2xl font-bold text-blue-700">${totalCash.toLocaleString()}</p>
            <p className="text-sm text-slate-600">
              {balanceMatches ? "Synced with bank accounts" : `Bank balance: $${bankAccountBalance.toLocaleString()}`}
            </p>
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
    </div>
  );
}