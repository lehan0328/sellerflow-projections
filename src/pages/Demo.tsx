import React, { useState } from "react";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { CashFlowInsights } from "@/components/cash-flow/cash-flow-insights";
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 overflow-auto">
          <div className="relative pb-6">
            <DashboardHeader />
            
            <div className="container mx-auto px-4 sm:px-6 mt-20 space-y-6">
              <OverviewStats
                totalCash={45230}
                events={mockEvents}
                onUpdateCashBalance={() => {}}
                pendingIncomeToday={{amount: 0, count: 0}}
              />

              <CashFlowCalendar
                events={mockEvents}
                totalCash={45230}
                bankAccountBalance={45230}
              />

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
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Demo;
