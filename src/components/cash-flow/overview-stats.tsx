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

export function OverviewStats({ totalCash = 145750, events = [] }: OverviewStatsProps) {
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
            <p className="text-sm text-muted-foreground">+8.2% from last month</p>
          </div>
          <DollarSign className="h-8 w-8 text-success" />
        </div>
      </div>
      <StatCard
        title="Credit Utilization"
        value="$18,450.00"
        subtitle="of $24,700.00 limit"
        trend="down"
        trendValue="74.7% utilization"
        variant="warning"
        icon={<CreditCard className="h-6 w-6 text-warning" />}
      />
      <StatCard
        title="Next Payout"
        value="$4,250.00"
        subtitle="Amazon - Sep 25"
        trend="up"
        trendValue="2 days"
        variant="info"
        icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
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