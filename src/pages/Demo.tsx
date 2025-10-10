import { Card } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingUp, Calendar, CreditCard } from "lucide-react";

const Demo = () => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar activeSection="overview" onSectionChange={() => {}} />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Dashboard Demo</h1>
              <p className="text-muted-foreground">
                Interactive preview of your financial command center
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Current Cash Balance"
                value="$45,230"
                icon={<DollarSign className="h-6 w-6 text-primary" />}
                trend="up"
                trendValue="+12.5%"
                subtitle="Total liquid assets"
              />
              <StatCard
                title="Available Credit"
                value="$18,500"
                icon={<CreditCard className="h-6 w-6 text-primary" />}
                trend="up"
                trendValue="+5.2%"
                subtitle="Across all cards"
              />
              <StatCard
                title="Upcoming Income"
                value="$12,400"
                icon={<TrendingUp className="h-6 w-6 text-primary" />}
                trend="up"
                trendValue="+8.3%"
                subtitle="Next 30 days"
              />
              <StatCard
                title="Due This Week"
                value="$3,250"
                icon={<Calendar className="h-6 w-6 text-primary" />}
                subtitle="Bills & payments"
              />
            </div>

            {/* Calendar Preview */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Cash Flow Calendar</h2>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Calendar className="h-12 w-12 mx-auto text-primary" />
                  <p className="text-muted-foreground">
                    Visual timeline of income and expenses
                  </p>
                </div>
              </div>
            </Card>

            {/* Insights */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Financial Insights</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-success mt-2" />
                  <div>
                    <p className="font-medium">Strong Cash Position</p>
                    <p className="text-sm text-muted-foreground">
                      Your current balance exceeds safe spending threshold by 15%
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                  <div>
                    <p className="font-medium">Upcoming Payment</p>
                    <p className="text-sm text-muted-foreground">
                      Credit card payment of $2,450 due in 5 days
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">Revenue Growth</p>
                    <p className="text-sm text-muted-foreground">
                      Amazon payouts up 23% compared to last month
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Demo;
