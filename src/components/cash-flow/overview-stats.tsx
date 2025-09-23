import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react";

export function OverviewStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Available Cash"
        value="$14,273.68"
        trend="up"
        trendValue="+8.2% from last month"
        variant="positive"
        icon={<DollarSign className="h-6 w-6 text-success" />}
      />
      <StatCard
        title="Credit Utilization"
        value="$25,959.18"
        subtitle="of $24,700.00 limit"
        trend="down"
        trendValue="93.4% utilization"
        variant="warning"
        icon={<CreditCard className="h-6 w-6 text-warning" />}
      />
      <StatCard
        title="Next Payout"
        value="$4,250.00"
        subtitle="Amazon - Sep 25"
        trend="up"
        trendValue="2 days"
        variant="primary"
        icon={<TrendingUp className="h-6 w-6 text-primary-foreground" />}
      />
      <StatCard
        title="Upcoming Payments"
        value="$8,450.00"
        subtitle="Next 7 days"
        trend="neutral"
        trendValue="4 payments due"
        variant="default"
        icon={<Calendar className="h-6 w-6 text-primary" />}
      />
    </div>
  );
}