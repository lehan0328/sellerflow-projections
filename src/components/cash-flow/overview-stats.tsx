import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react";

export function OverviewStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Available Cash"
        value="$145,750"
        trend="up"
        trendValue="+8.2% from last month"
        variant="positive"
        icon={<DollarSign className="h-6 w-6 text-success" />}
      />
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
        value="$8,450.00"
        subtitle="Next 7 days"
        trend="neutral"
        trendValue="4 payments due"
        variant="danger"
        icon={<Calendar className="h-6 w-6 text-red-600" />}
      />
    </div>
  );
}