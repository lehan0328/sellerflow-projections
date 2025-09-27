import React, { useState } from "react";
import { addDays, isToday, isBefore, startOfDay } from "date-fns";
import { DemoDashboardHeader } from "@/components/cash-flow/demo-dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards, getCreditCardDueDates } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { IncomeOverview } from "@/components/cash-flow/income-overview";
import { IncomeForm } from "@/components/cash-flow/income-form";
import { useDemoVendors, useDemoTransactions, useDemoUserSettings } from "@/hooks/useDemoData";

// Demo data and types
interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  source?: string;
  date: Date;
}

const DemoPage = () => {
  // Demo state
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  
  // Use real data from demo user
  const { vendors } = useDemoVendors();
  const { transactions } = useDemoTransactions();
  const { totalCash } = useDemoUserSettings();

  // Demo cash flow events (minimal - most come from vendors)
  const [demoCashFlowEvents] = useState<CashFlowEvent[]>([]);

  // Demo event handlers (show alerts for demo)
  const handleEditTransaction = (transaction: any) => {
    alert(`Demo: Viewing transaction details for ${transaction.description}`);
  };

  const handleUpdateCashBalance = () => {
    alert('Demo: This would sync with bank accounts in the full version');
  };

  // Demo income items - convert from transactions
  const demoIncomeItems = transactions
    .filter(t => t.type === 'sales_order')
    .map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      paymentDate: t.transactionDate,
      source: 'Demo Source',
      status: t.status === 'completed' ? 'received' as const : 'pending' as const,
      category: 'Service Revenue',
      isRecurring: false
    }));

  const handleCollectIncome = (income: any) => {
    alert(`Demo: Would collect $${income.amount} from ${income.source}`);
  };

  // Convert vendor due dates to calendar events
  const vendorEvents: CashFlowEvent[] = vendors
    .filter(vendor => vendor.totalOwed > 0 && vendor.nextPaymentDate)
    .map(vendor => ({
      id: `vendor-${vendor.id}`,
      type: 'outflow' as const,
      amount: vendor.nextPaymentAmount,
      description: `${vendor.name} - ${vendor.poName || 'Payment Due'}`,
      vendor: vendor.name,
      date: vendor.nextPaymentDate
    }));

  // Get credit card due date events
  const creditCardEvents = getCreditCardDueDates();

  // Combine all events for calendar
  const allCalendarEvents = [...demoCashFlowEvents, ...vendorEvents, ...creditCardEvents];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DemoDashboardHeader />
      <div className="p-6 space-y-6">
        <OverviewStats 
          totalCash={totalCash} 
          events={allCalendarEvents}
          onUpdateCashBalance={handleUpdateCashBalance}
        />
        
        {/* Row 1: Cash Flow Calendar (Full Width) */}
        <CashFlowCalendar 
          events={allCalendarEvents}
          onEditTransaction={handleEditTransaction}
        />

        {/* Row 2: Vendors Overview and Income Overview (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorsOverview 
            onEditOrder={() => alert('Demo: Vendor editing not available in demo')}
          />
          <IncomeOverview 
            incomeItems={demoIncomeItems}
            onCollectToday={handleCollectIncome}
          />
        </div>

        {/* Row 3: Bank Accounts and Credit Cards (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankAccounts />
          <CreditCards />
        </div>

        {/* Row 4: Amazon Payouts (Full Width) */}
        <AmazonPayouts />
      </div>

      <FloatingMenu 
        onAddPurchaseOrder={() => alert('Demo: Purchase order creation not available in demo')}
        onAddIncome={() => alert('Demo: Income entry not available in demo')}
        onAddRecurringIncome={() => alert('Demo: Recurring income setup not available in demo')}
      />

      <PurchaseOrderForm 
        open={showPurchaseOrderForm}
        onOpenChange={setShowPurchaseOrderForm}
        vendors={[]}
        onSubmitOrder={() => alert('Demo: Form submission not available in demo')}
        onAddVendor={() => alert('Demo: Vendor creation not available in demo')}
        onDeleteAllVendors={() => alert('Demo: Delete all vendors not available in demo')}
      />

      <IncomeForm 
        open={showIncomeForm || showRecurringIncomeForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowIncomeForm(false);
            setShowRecurringIncomeForm(false);
          }
        }}
        onSubmitIncome={() => alert('Demo: Form submission not available in demo')}
      />
    </div>
  );
};

export default DemoPage;