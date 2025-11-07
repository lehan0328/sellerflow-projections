import { useState } from 'react';
import { useSafeSpending } from '@/hooks/useSafeSpending';
import { useReserveAmount } from '@/hooks/useReserveAmount';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Bug } from 'lucide-react';
import { format } from 'date-fns';
import DailyBalanceTable from '@/components/debug/DailyBalanceTable';
import BuyingOpportunitiesTable from '@/components/debug/BuyingOpportunitiesTable';

const DebugProjections = () => {
  const { reserveAmount } = useReserveAmount();
  const { data, isLoading, error } = useSafeSpending(reserveAmount || 1000, false, false);
  const { accounts } = useBankAccounts();
  const [showNegativeOnly, setShowNegativeOnly] = useState(false);

  const currentBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

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
          <CardTitle>Daily Balance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyBalanceTable 
            dailyBalances={filteredBalances}
            reserveAmount={reserveAmount || 0}
            currentBalance={currentBalance}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugProjections;
