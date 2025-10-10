import React, { useState } from "react";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { CashFlowInsights } from "@/components/cash-flow/cash-flow-insights";
import { TransactionsView } from "@/components/TransactionsView";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards } from "@/components/cash-flow/credit-cards";
import { RecurringExpensesOverview } from "@/components/cash-flow/recurring-expenses-overview";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import ScenarioPlanner from "@/pages/ScenarioPlanner";
import Analytics from "@/pages/Analytics";
import DocumentStorage from "@/pages/DocumentStorage";
import Support from "@/pages/Support";
import { ReferralDashboardContent } from "@/components/ReferralDashboardContent";
import { addDays } from "date-fns";

// Mock data for demo
const mockEvents = [
  {
    id: '1',
    type: 'inflow' as const,
    amount: 5000,
    description: 'Amazon Payout',
    date: new Date(),
    affectsBalance: true
  },
  {
    id: '2',
    type: 'outflow' as const,
    amount: 1250,
    description: 'Inventory Purchase',
    vendor: 'ABC Supplies',
    date: addDays(new Date(), 2),
    affectsBalance: true
  },
  {
    id: '3',
    type: 'inflow' as const,
    amount: 3500,
    description: 'Amazon Payout',
    date: addDays(new Date(), 7),
    affectsBalance: true
  },
  {
    id: '4',
    type: 'credit-payment' as const,
    amount: 2450,
    description: 'Credit Card Payment',
    creditCard: 'Business Card',
    date: addDays(new Date(), 5),
    affectsBalance: true
  }
];

const Demo = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [financialsView, setFinancialsView] = useState<"bank-accounts" | "credit-cards">("bank-accounts");

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <>
            <OverviewStats
              totalCash={45230}
              events={mockEvents}
              onUpdateCashBalance={() => {}}
              pendingIncomeToday={{amount: 0, count: 0}}
            />

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CashFlowCalendar
                  events={mockEvents}
                  totalCash={45230}
                  bankAccountBalance={45230}
                />
              </div>
              <div className="lg:col-span-1 h-full">
                <CashFlowInsights
                  currentBalance={45230}
                  dailyInflow={5000}
                  dailyOutflow={1250}
                  upcomingExpenses={2450}
                  events={mockEvents}
                  safeSpendingLimit={30000}
                  reserveAmount={15000}
                  projectedLowestBalance={38000}
                />
              </div>
            </div>
          </>
        );
      
      case "transactions":
        return (
          <TransactionsView
            bankTransactions={[]}
            onVendorUpdate={() => {}}
            refreshKey={0}
            incomeItems={[]}
            onCollectToday={() => {}}
            onEditIncome={() => {}}
            onDeleteIncome={async () => {}}
            onMatchTransaction={async () => {}}
          />
        );
      
      case "financials":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Financials</h2>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setFinancialsView("bank-accounts")}
                  className={`px-4 py-2 rounded-md transition-all ${
                    financialsView === "bank-accounts"
                      ? "bg-background shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bank Accounts
                </button>
                <button
                  onClick={() => setFinancialsView("credit-cards")}
                  className={`px-4 py-2 rounded-md transition-all ${
                    financialsView === "credit-cards"
                      ? "bg-background shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Credit Cards
                </button>
              </div>
            </div>
            {financialsView === "bank-accounts" ? <BankAccounts /> : <CreditCards />}
          </div>
        );
      
      case "recurring":
        return <RecurringExpensesOverview />;
      
      case "amazon":
        return <AmazonPayouts />;
      
      case "scenario-planning":
        return <ScenarioPlanner />;
      
      case "analytics":
        return <Analytics />;
      
      case "document-storage":
        return <DocumentStorage />;
      
      case "support":
        return <Support />;
      
      case "referrals":
        return <ReferralDashboardContent isDemo={true} />;
      
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
        />
        
        <div className="flex-1 overflow-auto relative">
          {/* Subtle gradient orbs */}
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tl from-accent/5 to-transparent rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Header with sidebar trigger */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center min-h-[120px] px-6">
              <SidebarTrigger className="mr-4 self-start mt-6" />
              <DashboardHeader isDemo={true} />
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {renderSection()}
          </div>

          {/* FloatingMenu removed from demo - no adding transactions */}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Demo;
