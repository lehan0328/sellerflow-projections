import React, { useState } from "react";
import { addDays, startOfDay } from "date-fns";
import { DemoDashboardHeader } from "@/components/cash-flow/demo-dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { CashFlowInsights } from "@/components/cash-flow/cash-flow-insights";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards, getCreditCardDueDates } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { IncomeOverview } from "@/components/cash-flow/income-overview";
import { IncomeForm } from "@/components/cash-flow/income-form";
import { useDemoVendors, useDemoTransactions, useDemoUserSettings } from "@/hooks/useDemoData";
import { BankTransaction } from "@/components/cash-flow/bank-transaction-log";

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
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  
  // Use demo data hooks
  const { vendors } = useDemoVendors();
  const { transactions } = useDemoTransactions();
  const { totalCash } = useDemoUserSettings();

  // Example bank transactions for demo matching
  const exampleBankTransactions: BankTransaction[] = [
    {
      id: '1',
      accountId: 'demo-acc-1',
      accountName: 'Business Checking',
      institutionName: 'Demo Bank',
      date: new Date(),
      description: 'ACME CORP',
      merchantName: 'Acme Corp',
      amount: -1500,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    }
  ];

  const today = startOfDay(new Date());

  // Calculate today's activity for insights
  const todayInflow = transactions
    .filter(t => startOfDay(t.transactionDate).getTime() === today.getTime() && 
                 (t.type === 'customer_payment' || t.type === 'sales_order') &&
                 t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const todayOutflow = transactions
    .filter(t => startOfDay(t.transactionDate).getTime() === today.getTime() && 
                 (t.type === 'purchase_order' || t.type === 'vendor_payment') &&
                 t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const upcomingExpenses = transactions
    .filter(t => {
      const txDate = startOfDay(t.transactionDate);
      const sevenDaysOut = addDays(today, 7);
      return txDate > today && txDate <= sevenDaysOut &&
             (t.type === 'purchase_order' || t.type === 'vendor_payment') &&
             t.status === 'pending';
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Event handlers for demo
  const handleEditTransaction = (transaction: any) => {
    alert(`Demo: Viewing transaction details for ${transaction.description}`);
  };

  const handleUpdateCashBalance = () => {
    alert('Demo: This would sync with bank accounts in the full version');
  };

  const handleCollectIncome = (income: any) => {
    alert(`Demo: Would collect $${income.amount} from ${income.source}`);
  };

  const handleDeleteIncome = (income: any) => {
    alert(`Demo: Would delete income: ${income.description}`);
  };

  const handleEditIncome = (income: any) => {
    alert(`Demo: Would edit income: ${income.description}`);
  };

  // Convert demo income items from transactions
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

  // Filter active vendors (matching real dashboard)
  const activeVendors = vendors.filter(v => v.totalOwed > 0);

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
  const allCalendarEvents = [...vendorEvents, ...creditCardEvents];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DemoDashboardHeader />
      
      <div className="p-6 space-y-6">
        <OverviewStats 
          totalCash={totalCash} 
          events={allCalendarEvents}
          onUpdateCashBalance={handleUpdateCashBalance}
        />
        
        {/* Row 1: Cash Flow Calendar and AI Insights (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[700px]">
          <div className="lg:col-span-2 h-full">
            <CashFlowCalendar 
              events={allCalendarEvents} 
              totalCash={totalCash}
              onEditTransaction={handleEditTransaction}
              todayInflow={todayInflow}
              todayOutflow={todayOutflow}
              upcomingExpenses={upcomingExpenses}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <CashFlowInsights
              currentBalance={totalCash}
              dailyInflow={todayInflow}
              dailyOutflow={todayOutflow}
              upcomingExpenses={upcomingExpenses}
              events={allCalendarEvents}
            />
          </div>
        </div>

        {/* Row 2: Vendors Overview and Income Overview (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorsOverview 
            vendors={activeVendors}
            bankTransactions={exampleBankTransactions}
            onVendorUpdate={() => {}}
            onDeleteVendor={async (vendorId) => {
              alert('Demo: Vendor deletion not available in demo');
            }}
            onEditOrder={(vendor) => {
              alert('Demo: Vendor editing not available in demo');
            }}
          />
          <IncomeOverview
            incomeItems={demoIncomeItems}
            onCollectToday={handleCollectIncome}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        </div>

        {/* Row 3: Bank Accounts and Credit Cards (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankAccounts />
          <CreditCards />
        </div>

        {/* Row 4: Amazon Payouts (Full Width) */}
        {(vendors.length > 0 || transactions.length > 0) && <AmazonPayouts />}
      </div>

      <FloatingMenu
        onAddPurchaseOrder={() => alert('Demo: Purchase order creation not available in demo')}
        onAddIncome={() => alert('Demo: Income entry not available in demo')}
        onAddRecurringIncome={() => alert('Demo: Recurring income setup not available in demo')}
      />

      {showPurchaseOrderForm && (
        <PurchaseOrderForm
          vendors={[]}
          open={showPurchaseOrderForm}
          onOpenChange={setShowPurchaseOrderForm}
          onSubmitOrder={() => alert('Demo: Form submission not available in demo')}
          onDeleteAllVendors={() => alert('Demo: Delete all vendors not available in demo')}
          onAddVendor={() => alert('Demo: Add vendor not available in demo')}
        />
      )}

      <IncomeForm 
        open={showIncomeForm || showRecurringIncomeForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowIncomeForm(false);
            setShowRecurringIncomeForm(false);
          }
        }}
        onSubmitIncome={() => alert('Demo: Form submission not available in demo')}
        customers={[]}
      />
    </div>
  );
};

export default DemoPage;