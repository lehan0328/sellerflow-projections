import { useState, useMemo } from 'react';
import { useSafeSpending } from '@/hooks/useSafeSpending';
import { useReserveAmount } from '@/hooks/useReserveAmount';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useVendorTransactions } from '@/hooks/useVendorTransactions';
import { useIncome } from '@/hooks/useIncome';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useAmazonPayouts } from '@/hooks/useAmazonPayouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Bug } from 'lucide-react';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import DailyBalanceTable from '@/components/debug/DailyBalanceTable';
import BuyingOpportunitiesTable from '@/components/debug/BuyingOpportunitiesTable';
import { calculateChartBalances } from '@/lib/chartDataProcessor';
import { generateRecurringDates } from '@/lib/recurringDates';

const DebugProjections = () => {
  const [showNegativeOnly, setShowNegativeOnly] = useState(false);
  
  // Balance type preference (matches Dashboard)
  const [useAvailableBalance, setUseAvailableBalance] = useState(() => {
    const saved = localStorage.getItem('useAvailableBalance');
    return saved !== null ? saved === 'true' : true; // Default to true (available balance)
  });
  
  const { reserveAmount } = useReserveAmount();
  const { accounts } = useBankAccounts();
  const { data, isLoading, error } = useSafeSpending(reserveAmount || 1000, false, useAvailableBalance);

  // Fetch all data sources for chart calculation (mimics Dashboard)
  const { transactions: vendorTransactions } = useVendorTransactions();
  const { incomeItems } = useIncome();
  const { recurringExpenses } = useRecurringExpenses();
  const { creditCards } = useCreditCards();
  const { amazonPayouts } = useAmazonPayouts();

  // Calculate current balance from accounts (matches Dashboard logic)
  const totalAvailableBalance = accounts.reduce((sum, account) => {
    return sum + (account.available_balance ?? account.balance);
  }, 0);
  
  const bankAccountBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
  
  // Use selected balance type (matches Dashboard)
  const currentBalance = useAvailableBalance ? totalAvailableBalance : bankAccountBalance;

  // Build calendar events (same logic as Dashboard)
  const allCalendarEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const events: any[] = [];

    // Add vendor transactions (purchase orders)
    vendorTransactions
      .filter(tx => tx.type === 'purchase_order' && tx.status !== 'completed')
      .forEach(tx => {
        const eventDate = tx.dueDate || tx.transactionDate;
        events.push({
          id: `vendor-tx-${tx.id}`,
          type: 'outflow',
          amount: Number(tx.amount),
          description: tx.description || 'Purchase Order',
          date: eventDate,
        });
      });

    // Add income items
    incomeItems
      .filter(income => income.status !== 'received')
      .forEach(income => {
        events.push({
          id: `income-${income.id}`,
          type: 'inflow',
          amount: Number(income.amount),
          description: income.description || 'Income',
          date: income.paymentDate,
        });
      });

    // Add credit card payments (simplified - use due date from card)
    creditCards.forEach((card, index) => {
      if (card.payment_due_date) {
        events.push({
          id: `cc-${card.id}-${index}`,
          type: 'credit-payment',
          amount: Number(card.balance || 0),
          description: `Credit Card Payment`,
          date: new Date(card.payment_due_date),
        });
      }
    });

    // Add recurring expenses
    recurringExpenses.forEach(expense => {
      const rangeEnd = addDays(today, 90);
      const recurringDates = generateRecurringDates(
        expense,
        today,
        rangeEnd
      );
      recurringDates.forEach((date, index) => {
        events.push({
          id: `recurring-${expense.id}-${index}`,
          type: 'outflow',
          amount: Number(expense.amount),
          description: expense.name || 'Recurring Expense',
          date: date,
        });
      });
    });

    // Add Amazon payouts (EXACT Dashboard logic)
    amazonPayouts.forEach(payout => {
      const isConfirmedPayout = payout.status === 'confirmed';
      const isOpenSettlement = payout.status === 'estimated';
      const isForecastedPayout = payout.status === 'forecasted';
      
      let displayDate: Date;
      let balanceImpactDate: Date;

      if (isConfirmedPayout) {
        // For confirmed: settlement_end_date + 1 day
        const rawData = payout.raw_settlement_data as any;
        const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
        
        if (settlementEndStr) {
          displayDate = new Date(settlementEndStr);
          displayDate.setDate(displayDate.getDate() + 1);
        } else {
          displayDate = new Date(payout.payout_date);
        }
        balanceImpactDate = displayDate;
        
      } else if (isOpenSettlement) {
        // For estimated: settlement_end_date + 1 day
        const rawData = payout.raw_settlement_data as any;
        const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
        const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
        
        if (settlementEndStr) {
          displayDate = new Date(settlementEndStr);
        } else if (settlementStartStr) {
          const settlementStartDate = new Date(settlementStartStr);
          const settlementCloseDate = new Date(settlementStartDate);
          settlementCloseDate.setDate(settlementCloseDate.getDate() + 14);
          displayDate = settlementCloseDate;
        } else {
          displayDate = new Date(payout.payout_date);
        }
        
        // Add +1 day for bank transfer for estimated payouts
        displayDate = new Date(displayDate);
        displayDate.setDate(displayDate.getDate() + 1);
        balanceImpactDate = displayDate;
        
      } else {
        // For forecasted: payout_date as-is, +1 for balance impact
        displayDate = new Date(payout.payout_date);
        balanceImpactDate = new Date(displayDate);
        balanceImpactDate.setDate(balanceImpactDate.getDate() + 1);
      }

      // Only include future payouts
      if (!isBefore(displayDate, today)) {
        events.push({
          id: `amazon-${payout.id}`,
          type: 'inflow',
          amount: Number(payout.total_amount),
          description: `Amazon Payout - ${payout.marketplace_name || 'Amazon'} (${payout.status})`,
          date: displayDate,
          balanceImpactDate: balanceImpactDate,
        });
      }
    });

    return events;
  }, [vendorTransactions, incomeItems, recurringExpenses, creditCards, amazonPayouts]);

  // Calculate chart balances
  const chartBalances = useMemo(() => {
    return calculateChartBalances(allCalendarEvents, currentBalance, 91);
  }, [allCalendarEvents, currentBalance]);

  const exportToCSV = () => {
    if (!data?.calculation?.daily_balances) return;

    const headers = ['Date', 'Ending Balance'];
    const rows = data.calculation.daily_balances.map(day => [
      day.date,
      day.balance.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projections-debug-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Bug className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading projection data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading data: {error || 'Unknown error'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dailyBalances = data.calculation?.daily_balances || [];
  const buyingOpportunities = data.calculation?.all_buying_opportunities || [];
  const filteredBalances = showNegativeOnly 
    ? dailyBalances.filter(day => day.balance < 0)
    : dailyBalances;

  const negativeDays = dailyBalances.filter(day => day.balance < 0).length;
  const lowestBalance = Math.min(...dailyBalances.map(day => day.balance));
  const lowestDay = dailyBalances.find(day => day.balance === lowestBalance);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8 text-yellow-500" />
            Projections Debug
          </h1>
          <p className="text-muted-foreground mt-1">
            Detailed breakdown of 90-day balance calculations and buying opportunities
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Balance Mode:</span>
            <Badge variant="outline">
              {useAvailableBalance ? 'Available Balance' : 'Current Balance'}
            </Badge>
          </div>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${currentBalance.toFixed(2)}
              </p>
            </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reserve Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${(reserveAmount || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lowest Projected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowestBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
              ${lowestBalance.toFixed(2)}
            </p>
            {lowestDay && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(lowestDay.date), 'MMM dd, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negative Days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${negativeDays > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {negativeDays}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              out of {dailyBalances.length} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Button
              variant={showNegativeOnly ? "default" : "outline"}
              onClick={() => setShowNegativeOnly(!showNegativeOnly)}
              size="sm"
            >
              {showNegativeOnly ? 'Show All Days' : 'Show Negative Days Only'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Displaying {filteredBalances.length} of {dailyBalances.length} days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Buying Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Buying Opportunities ({buyingOpportunities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <BuyingOpportunitiesTable opportunities={buyingOpportunities} />
        </CardContent>
      </Card>

      {/* Daily Balance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Balance Breakdown - Chart vs Buying Opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyBalanceTable 
            dailyBalances={filteredBalances}
            chartBalances={chartBalances}
            chartEvents={allCalendarEvents}
            reserveAmount={reserveAmount || 0}
            currentBalance={currentBalance}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugProjections;
