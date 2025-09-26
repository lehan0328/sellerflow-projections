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
  // Demo state - simplified for demo purposes
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  
  // Demo data - static for demonstration
  const [totalCash] = useState(15000);
  
  // Demo vendors
  const demoVendors = [
    {
      id: 'demo-1',
      name: 'Acme Corp',
      totalOwed: 2500,
      nextPaymentDate: addDays(new Date(), 3),
      nextPaymentAmount: 2500,
      status: 'upcoming' as const,
      category: 'Supplies',
      paymentType: 'net-terms' as const,
      poName: 'Office Equipment',
      description: 'Office supplies and equipment'
    },
    {
      id: 'demo-2',
      name: 'TechVendor LLC',
      totalOwed: 5000,
      nextPaymentDate: addDays(new Date(), 7),
      nextPaymentAmount: 5000,
      status: 'upcoming' as const,
      category: 'Technology',
      paymentType: 'total' as const,
      poName: 'Software License',
      description: 'Annual software licensing'
    }
  ];

  // Demo transactions
  const demoTransactions = [
    {
      id: 'demo-t1',
      type: 'purchase' as const,
      amount: 2500,
      description: 'Office Equipment - Acme Corp',
      date: new Date(),
      status: 'completed' as const,
      vendor: 'Acme Corp'
    },
    {
      id: 'demo-t2',
      type: 'payment' as const,
      amount: 1200,
      description: 'Client Payment Received',
      date: addDays(new Date(), -1),
      status: 'completed' as const
    }
  ];

  // Demo income items
  const demoIncomeItems = [
    {
      id: 'demo-i1',
      description: 'Client Project Payment',
      amount: 5000,
      paymentDate: addDays(new Date(), 2),
      source: 'Client A',
      status: 'pending' as const,
      category: 'Service Revenue',
      isRecurring: false
    }
  ];

  // Demo cash flow events
  const demoCashFlowEvents: CashFlowEvent[] = [
    {
      id: 'demo-cf1',
      type: 'inflow',
      amount: 5000,
      description: 'Client Project Payment',
      source: 'Client A',
      date: addDays(new Date(), 2)
    },
    {
      id: 'demo-cf2',
      type: 'outflow',
      amount: 2500,
      description: 'Acme Corp - Office Equipment',
      vendor: 'Acme Corp',
      date: addDays(new Date(), 3)
    }
  ];

  // Demo event handlers (non-functional for demo)
  const handlePayToday = (vendor: any) => {
    alert(`Demo: Would pay $${vendor.nextPaymentAmount} to ${vendor.name}`);
  };

  const handleUndoTransaction = (transactionId: string) => {
    alert(`Demo: Would undo transaction ${transactionId}`);
  };

  const handlePurchaseOrderSubmit = (orderData: any) => {
    alert(`Demo: Would create purchase order for ${orderData.vendor}`);
    setShowPurchaseOrderForm(false);
  };

  const handleIncomeSubmit = (incomeData: any) => {
    alert(`Demo: Would add income of $${incomeData.amount}`);
    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleExpenseSubmit = (expenseData: any) => {
    alert(`Demo: Would add expense of $${expenseData.amount}`);
    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleCollectIncome = (income: any) => {
    alert(`Demo: Would collect $${income.amount} from ${income.source}`);
  };

  const handleEditTransaction = (transaction: any) => {
    alert(`Demo: Would edit transaction ${transaction.description}`);
  };

  const handleUpdateCashBalance = () => {
    alert('Demo: Would update cash balance from bank accounts');
  };

  // Convert vendor due dates to calendar events
  const vendorEvents: CashFlowEvent[] = demoVendors
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
        
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <CashFlowCalendar 
              events={allCalendarEvents}
              onEditTransaction={handleEditTransaction}
            />
            
            <VendorsOverview 
              onEditOrder={() => alert('Demo: Vendor editing not available in demo')}
            />
            
            <IncomeOverview 
              incomeItems={demoIncomeItems}
              onCollectToday={handleCollectIncome}
            />
          </div>
          
          <div className="lg:col-span-4 space-y-6">
            <BankAccounts />
            <CreditCards />
            <AmazonPayouts />
          </div>
        </div>
      </div>

      <FloatingMenu 
        onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)}
        onAddIncome={() => setShowIncomeForm(true)}
        onAddRecurringIncome={() => setShowRecurringIncomeForm(true)}
      />

      <PurchaseOrderForm 
        open={showPurchaseOrderForm}
        onOpenChange={setShowPurchaseOrderForm}
        vendors={[]}
        onSubmitOrder={handlePurchaseOrderSubmit}
      />

      <IncomeForm 
        open={showIncomeForm || showRecurringIncomeForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowIncomeForm(false);
            setShowRecurringIncomeForm(false);
          }
        }}
        onSubmitIncome={handleIncomeSubmit}
      />
    </div>
  );
};

export default DemoPage;