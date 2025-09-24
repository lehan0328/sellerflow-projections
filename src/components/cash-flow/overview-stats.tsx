import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, Calendar, AlertTriangle } from "lucide-react";

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

export function OverviewStats({ totalCash = 0, events = [], onUpdateCashBalance }: OverviewStatsProps) {
  console.log("OverviewStats render - totalCash:", totalCash);
  
  // Calculate dynamic values based on events
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  
  // Calculate upcoming payments in next 7 days
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const upcomingPayments = events.filter(event => 
    (event.type === 'outflow' || event.type === 'purchase-order' || event.type === 'credit-payment') &&
    event.date >= new Date() && 
    event.date <= nextWeek
  );
  
  const upcomingTotal = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Bank account balance (from bank-accounts.tsx sample data)
  const bankAccountBalance = 14269.39 + 4.29; // Total from Bank of America + Bluevine
  const balanceMatches = Math.abs(totalCash - bankAccountBalance) < 0.01;
  
  // Calculate credit card totals
  const totalCreditBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.limit, 0);
  const totalAvailableCredit = creditCards.reduce((sum, card) => sum + Math.max(0, card.availableCredit), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0;
  
  const getCreditVariant = () => {
    if (creditUtilization >= 90) return "danger";
    if (creditUtilization >= 70) return "warning";
    return "positive";
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-emerald-700 font-medium">Total Available Cash</p>
              {!balanceMatches && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUpdateCashBalance}
                  className="h-6 w-6 p-0 text-warning hover:text-warning-foreground"
                  title={`The cash available does not match your synced bank account. Do you want to update?`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-2xl font-bold text-emerald-800">${totalCash.toLocaleString()}</p>
            <p className="text-sm text-emerald-600">
              {balanceMatches ? "Synced with bank accounts" : `Bank balance: $${bankAccountBalance.toLocaleString()}`}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-emerald-600" />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-purple-700 font-medium">Credit Utilization</p>
            <p className="text-2xl font-bold text-purple-800">{formatCurrency(totalCreditBalance)}</p>
            <p className="text-sm text-purple-600">of {formatCurrency(totalCreditLimit)} limit</p>
            <p className="text-xs text-purple-500 mt-1">{creditUtilization.toFixed(1)}% utilization</p>
          </div>
          <CreditCard className="h-8 w-8 text-purple-600" />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-blue-50 to-sky-100 border border-blue-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-blue-700 font-medium">Incoming $</p>
            <p className="text-2xl font-bold text-blue-800">$0.00</p>
            <p className="text-sm text-blue-600">No scheduled payouts</p>
            <p className="text-xs text-blue-500 mt-1">--</p>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-rose-50 to-pink-100 border border-rose-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-rose-700 font-medium">Upcoming Payments</p>
            <p className="text-2xl font-bold text-rose-800">{formatCurrency(upcomingTotal)}</p>
            <p className="text-sm text-rose-600">Next 7 days</p>
            <p className="text-xs text-rose-500 mt-1">{upcomingPayments.length} payments due</p>
          </div>
          <Calendar className="h-8 w-8 text-rose-600" />
        </div>
      </div>
    </div>
  );
}