import React, { useState } from "react";
import { addDays } from "date-fns";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { TransactionLog, Transaction } from "@/components/cash-flow/transaction-log";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { VendorForm } from "@/components/cash-flow/vendor-form";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { IncomeOverview } from "@/components/cash-flow/income-overview";
import { IncomeForm } from "@/components/cash-flow/income-form";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserSettings } from "@/hooks/useUserSettings";

// ========== Type Definitions ==========

interface CashFlowEvent {
  id: string;
  type: 'income' | 'expense' | 'vendor_payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  source?: string;
  date: Date;
}

const Dashboard = () => {
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  
  // Use database hooks
  const { vendors, addVendor, updateVendor } = useVendors();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { totalCash, updateTotalCash } = useUserSettings();
  
  // State for vendors used in forms (derived from database vendors)
  const formVendors = vendors.map(v => ({ 
    id: v.id, 
    name: v.name, 
    paymentType: v.paymentType || 'total', 
    netTermsDays: v.netTermsDays || '30' 
  }));

  const [cashFlowEvents, setCashFlowEvents] = useState<CashFlowEvent[]>([]);
  
  // Sample income data - in real app this would come from database
  const [incomeItems, setIncomeItems] = useState<Array<{
    id: string;
    description: string;
    amount: number;
    paymentDate: Date;
    source: string;
    status: 'received' | 'pending' | 'overdue';
    category: string;
    isRecurring: boolean;
  }>>([]);

  // Initialize sample data only if user has no real data yet
  React.useEffect(() => {
    if (vendors.length === 0 && transactions.length === 0 && incomeItems.length === 0) {
      // Only show sample data for demo purposes if no real data exists
      setIncomeItems([
        {
          id: 'sample-1',
          description: 'Amazon Quarterly Payout',
          amount: 25000,
          paymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          source: 'Amazon',
          status: 'pending' as const,
          category: 'Product Sales',
          isRecurring: false
        },
        {
          id: 'sample-2',
          description: 'Monthly Subscription Revenue',
          amount: 5000,
          paymentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          source: 'Stripe',
          status: 'pending' as const,
          category: 'Subscription',
          isRecurring: true
        }
      ]);
    }
  }, [vendors.length, transactions.length]);

  // State for vendor editing modal
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // ========== Event Handlers ==========

  const handlePayToday = async (vendor: Vendor, amount?: number) => {
    const paymentAmount = amount || vendor.nextPaymentAmount;
    
    console.info("Deducting cash amount:", paymentAmount);
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash - paymentAmount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

    // Update vendor
    await updateVendor(vendor.id, { 
      totalOwed: Math.max(0, vendor.totalOwed - paymentAmount) 
    });

    // Add transaction
    await addTransaction({
      type: 'vendor_payment',
      amount: paymentAmount,
      description: `Payment to ${vendor.name}`,
      vendorId: vendor.id,
      transactionDate: new Date(),
      status: 'completed'
    });

    // Add cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'vendor_payment',
      amount: paymentAmount,
      description: `Payment to ${vendor.name}`,
      vendor: vendor.name,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);
  };

  const handleUndoTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Restore cash based on transaction type
    if (transaction.type === 'purchase_order') {
      await updateTotalCash(totalCash + transaction.amount);
    } else if (transaction.type === 'sales_order') {
      await updateTotalCash(totalCash - transaction.amount);
    } else if (transaction.type === 'vendor_payment') {
      await updateTotalCash(totalCash + transaction.amount);
      
      // Restore vendor balance if it was a vendor payment
      if (transaction.vendorId) {
        const vendor = vendors.find(v => v.id === transaction.vendorId);
        if (vendor) {
          await updateVendor(vendor.id, { 
            totalOwed: vendor.totalOwed + transaction.amount 
          });
        }
      }
    }

    // Remove transaction
    await deleteTransaction(transactionId);
    
    // Remove corresponding cash flow event
    setCashFlowEvents(prev => prev.filter(e => 
      !(e.description === transaction.description && e.amount === transaction.amount)
    ));
  };

  const handlePurchaseOrderSubmit = async (orderData: any) => {
    console.info("Purchase order received in Dashboard:", orderData);
    
    const amount = typeof orderData.amount === 'string' ? 
      parseFloat(orderData.amount) : orderData.amount;
    
    console.info("Deducting cash amount:", amount);
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash - amount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

    // Find existing vendor or create new one with PO details
    let vendor = vendors.find(v => v.name === orderData.vendor);
    
    if (!vendor) {
      // Create new vendor with purchase order details
      const paymentSchedule = orderData.paymentSchedule || [];
      let nextPaymentDate = orderData.dueDate;
      let nextPaymentAmount = amount;
      
      // For net terms, calculate due date
      if (orderData.paymentType === 'net-terms') {
        const days = orderData.netTermsDays === 'custom' ? 
          parseInt(orderData.customDays) : parseInt(orderData.netTermsDays);
        nextPaymentDate = addDays(new Date(), days);
      }
      
      // For preorder, use first payment
      if (orderData.paymentType === 'preorder' && paymentSchedule.length > 0) {
        nextPaymentDate = paymentSchedule[0].dueDate;
        nextPaymentAmount = parseFloat(paymentSchedule[0].amount);
      }

      vendor = await addVendor({
        name: orderData.vendor,
        totalOwed: amount,
        nextPaymentDate: nextPaymentDate || new Date(),
        nextPaymentAmount: nextPaymentAmount,
        status: 'upcoming',
        category: orderData.category || '',
        paymentType: orderData.paymentType,
        netTermsDays: orderData.netTermsDays,
        poName: orderData.poName,
        description: orderData.description,
        notes: orderData.notes,
        paymentSchedule: paymentSchedule
      });
    } else {
      // Update existing vendor with new order details
      const updatedTotalOwed = vendor.totalOwed + amount;
      await updateVendor(vendor.id, {
        totalOwed: updatedTotalOwed,
        poName: orderData.poName,
        description: orderData.description,
        notes: orderData.notes,
        paymentType: orderData.paymentType,
        netTermsDays: orderData.netTermsDays,
        paymentSchedule: orderData.paymentSchedule || []
      });
      vendor = { ...vendor, totalOwed: updatedTotalOwed };
    }

    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: `${orderData.poName} - ${orderData.vendor}`,
      vendorId: vendor?.id,
      transactionDate: new Date(),
      dueDate: orderData.dueDate,
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'purchase-order',
      amount: amount,
      description: `${orderData.poName} - ${orderData.vendor}`,
      vendor: orderData.vendor,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowPurchaseOrderForm(false);
  };

  const handleIncomeSubmit = async (incomeData: any) => {
    const amount = typeof incomeData.amount === 'string' ? 
      parseFloat(incomeData.amount) : incomeData.amount;
    
    console.info("Adding income amount:", amount);
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash + amount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

    // Add to income items
    const newIncomeItem = {
      ...incomeData,
      id: Date.now().toString(),
      amount: amount,
      paymentDate: incomeData.paymentDate || new Date(),
      status: 'received' as const
    };
    setIncomeItems(prev => [newIncomeItem, ...prev]);

    // Create transaction
    await addTransaction({
      type: 'sales_order',
      amount: amount,
      description: incomeData.description || 'Income',
      transactionDate: incomeData.paymentDate || new Date(),
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'income',
      amount: amount,
      description: incomeData.description || 'Income',
      date: incomeData.paymentDate || new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleExpenseSubmit = async (expenseData: any) => {
    const amount = typeof expenseData.amount === 'string' ? 
      parseFloat(expenseData.amount) : expenseData.amount;
    
    console.info("Adding expense amount:", amount);
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash - amount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

    // Create vendor for expense
    await addVendor({
      name: expenseData.description,
      totalOwed: amount,
      nextPaymentDate: expenseData.paymentDate || new Date(),
      nextPaymentAmount: amount,
      status: 'upcoming',
      category: expenseData.category || 'Other',
      paymentType: 'total',
      description: expenseData.description,
      notes: expenseData.notes
    });

    // Create transaction
    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: expenseData.description || 'Expense',
      transactionDate: expenseData.paymentDate || new Date(),
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'expense',
      amount: amount,
      description: expenseData.description || 'Expense',
      date: expenseData.paymentDate || new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleCollectIncome = async (income: any) => {
    console.info("Collecting income amount:", income.amount);
    
    const newTotalCash = totalCash + income.amount;
    await updateTotalCash(newTotalCash);

    // Create transaction
    await addTransaction({
      type: 'sales_order',
      amount: income.amount,
      description: income.description,
      transactionDate: new Date(),
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'income',
      amount: income.amount,
      description: income.description,
      source: income.source,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);
  };

  const handleEditVendorOrder = (vendor: Vendor) => {
    setEditingVendor(vendor);
  };

  const handleSaveVendorOrder = async (updatedVendor: Vendor) => {
    await updateVendor(updatedVendor.id, updatedVendor);
    setEditingVendor(null);
  };

  const handleAddVendor = async (vendorData: any) => {
    await addVendor({
      name: vendorData.name,
      totalOwed: 0,
      nextPaymentDate: new Date(),
      nextPaymentAmount: 0,
      status: 'upcoming',
      category: vendorData.category || '',
      paymentType: vendorData.paymentType,
      netTermsDays: vendorData.netTermsDays
    });
  };

  // Convert database transactions to component format
  const formattedTransactions = transactions.map(t => ({
    id: t.id,
    type: t.type === 'vendor_payment' ? 'payment' as const : 
          t.type === 'purchase_order' ? 'purchase' as const : 'adjustment' as const,
    amount: t.amount,
    description: t.description,
    date: t.transactionDate,
    status: t.status,
    vendor: t.vendorId ? vendors.find(v => v.id === t.vendorId)?.name : undefined
  }));

  // Filter vendors to exclude 'paid' status for VendorsOverview component
  const activeVendors = vendors.filter(v => v.status !== 'paid');

  // Sample cash flow events for calendar visualization with Amazon payouts (only show if no real data)
  const sampleEvents = vendors.length === 0 && transactions.length === 0 ? [
    {
      id: 'sample-event-1',
      type: 'inflow' as const,
      amount: 25000,
      description: 'Amazon Payout',
      source: 'amazon',
      date: new Date()
    },
    {
      id: 'sample-event-2', 
      type: 'outflow' as const,
      amount: 8500,
      description: 'Inventory Purchase',
      vendor: 'Global Vendor Co.',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sample-event-3',
      type: 'inflow' as const,
      amount: 32000,
      description: 'Amazon Payout - Holiday Sales',
      source: 'amazon',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'sample-event-4',
      type: 'inflow' as const,
      amount: 18500,
      description: 'Amazon Payout - Q1 Performance',
      source: 'amazon',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  ] : [];

  // Convert cash flow events to calendar format
  const calendarEvents = cashFlowEvents.map(event => ({
    id: event.id,
    type: event.type === 'income' ? 'inflow' as const : 
          event.type === 'purchase-order' ? 'purchase-order' as const :
          event.type === 'vendor_payment' ? 'outflow' as const : 'outflow' as const,
    amount: event.amount,
    description: event.description,
    vendor: event.vendor,
    source: event.source,
    date: event.date
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DashboardHeader />
      <div className="p-6 space-y-6">
        <OverviewStats totalCash={totalCash} />
        
        {/* Row 1: Cash Flow Calendar (Full Width) */}
        <CashFlowCalendar events={[...sampleEvents, ...calendarEvents]} totalCash={totalCash} />

        {/* Row 2: Vendors Overview and Income Overview (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorsOverview 
            vendors={activeVendors as any}
            onPayToday={handlePayToday}
            onEditOrder={handleEditVendorOrder}
          />
          <IncomeOverview
            incomeItems={incomeItems}
            onCollectToday={handleCollectIncome}
            onIncomeUpdate={setIncomeItems}
          />
        </div>

        {/* Row 3: Transaction Log (Full Width) */}
        <TransactionLog 
          transactions={formattedTransactions}
          onUndoTransaction={handleUndoTransaction}
        />

        {/* Row 4: Bank Accounts and Credit Cards (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankAccounts />
          <CreditCards />
        </div>

        {/* Row 5: Amazon Payouts (Full Width) */}
        <AmazonPayouts />
      </div>

      <FloatingMenu
        onAddVendor={() => setShowVendorForm(true)}
        onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)}
        onAddIncome={() => setShowIncomeForm(true)}
        onAddRecurringIncome={() => setShowRecurringIncomeForm(true)}
      />

      {showPurchaseOrderForm && (
        <PurchaseOrderForm
          vendors={formVendors}
          open={showPurchaseOrderForm}
          onOpenChange={setShowPurchaseOrderForm}
          onSubmitOrder={handlePurchaseOrderSubmit}
        />
      )}

      {showVendorForm && (
        <VendorForm
          open={showVendorForm}
          onOpenChange={setShowVendorForm}
          onAddVendor={handleAddVendor}
        />
      )}

      {showIncomeForm && (
        <IncomeForm
          open={showIncomeForm}
          onOpenChange={setShowIncomeForm}
          onSubmitIncome={handleIncomeSubmit}
          onSubmitExpense={handleExpenseSubmit}
        />
      )}

      {showRecurringIncomeForm && (
        <IncomeForm
          open={showRecurringIncomeForm}
          onOpenChange={setShowRecurringIncomeForm}
          onSubmitIncome={handleIncomeSubmit}
          onSubmitExpense={handleExpenseSubmit}
          isRecurring={true}
        />
      )}

      {editingVendor && (
        <VendorOrderEditModal
          vendor={editingVendor as any}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onSave={handleSaveVendorOrder}
        />
      )}
    </div>
  );
};

export default Dashboard;