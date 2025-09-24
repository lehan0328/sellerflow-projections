import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react";

interface OverviewStatsProps {
  totalCash?: number;
  events?: Array<{
    type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
    amount: number;
    date: Date;
  }>;
}

export function OverviewStats({ totalCash = 0, events = [] }: OverviewStatsProps) {
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
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Available Cash</p>
            <p className="text-2xl font-bold text-success">${totalCash.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Ready to start tracking</p>
          </div>
          <DollarSign className="h-8 w-8 text-success" />
        </div>
      </div>
      <StatCard
        title="Credit Utilization"
        value="$0.00"
        subtitle="of $0.00 limit"
        trend="neutral"
        trendValue="0% utilization"
        variant="positive"
        icon={<CreditCard className="h-6 w-6 text-success" />}
      />
      <StatCard
        title="Next Payout"
        value="$0.00"
        subtitle="No scheduled payouts"
        trend="neutral"
        trendValue="--"
        variant="default"
        icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
      />
      <StatCard
        title="Upcoming Payments"
        value={formatCurrency(upcomingTotal)}
        subtitle="Next 7 days"
        trend="neutral"
        trendValue={`${upcomingPayments.length} payments due`}
        variant="danger"
        icon={<Calendar className="h-6 w-6 text-red-600" />}
      />
    </div>
  );
}