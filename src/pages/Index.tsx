import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <DashboardHeader />
        <OverviewStats />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <BankAccounts />
            <AmazonPayouts />
          </div>
          <div>
            <CreditCards />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
