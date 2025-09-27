import React, { useState, useMemo, useEffect } from "react";
import { addDays, isToday, isBefore, startOfDay, format } from "date-fns";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards, getCreditCardDueDates } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { IncomeOverview } from "@/components/cash-flow/income-overview";
import { IncomeForm } from "@/components/cash-flow/income-form";
import { useIncome } from "@/hooks/useIncome";

import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";

// ========== Type Definitions ==========

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

const Dashboard = () => {
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [showEditIncomeForm, setShowEditIncomeForm] = useState(false);
  
  // Use database hooks
  const { vendors, addVendor, updateVendor, deleteVendor, refetch: refetchVendors } = useVendors();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { totalBalance: bankAccountBalance, accounts } = useBankAccounts();
  
  // State for vendors used in forms (derived from database vendors) - always fresh data
  const formVendors = useMemo(() => {
    console.log('Dashboard - Creating formVendors from vendors:', vendors);
    const result = vendors.map(v => ({ 
      id: v.id, 
      name: v.name, 
      paymentType: v.paymentType || 'total',
      netTermsDays: (v.netTermsDays ?? '30') as any,
      category: v.category || "",
      source: v.source || 'unknown'
    }));
    console.log('Dashboard - formVendors result:', result);
    return result;
  }, [vendors]); // Recompute when vendors change
  
  // Force refresh vendors when opening Purchase Order form to ensure fresh data
  const handleOpenPurchaseOrderForm = () => {
    refetchVendors(); // Ensure we have the latest vendor data
    setShowPurchaseOrderForm(true);
  };

  const [cashFlowEvents, setCashFlowEvents] = useState<CashFlowEvent[]>([]);
  
  // Sample income data - replaced with database hook
  const { incomeItems, addIncome, updateIncome } = useIncome();

  // No sample data for new users

  // No sample data for new users

  // State for vendor editing modal
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // ========== Event Handlers ==========

  const handlePayToday = async (vendor: Vendor, amount?: number) => {
    const paymentAmount = amount || vendor.nextPaymentAmount;
    
    console.info("Processing payment:", paymentAmount, "Bank balance:", bankAccountBalance);
    
    // Note: In a real Plaid integration, this would trigger an actual bank transaction
    // For now, we just update the vendor status

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
      type: 'outflow',
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

    // Note: In a real Plaid integration, this would reverse the bank transaction
    // For now, we just update vendor status and remove the transaction

    // Remove transaction
    await deleteTransaction(transactionId);
    
    // Refresh vendors to show updated data
    refetchVendors();
    
    // Remove corresponding cash flow event
    setCashFlowEvents(prev => prev.filter(e => 
      !(e.description === transaction.description && e.amount === transaction.amount)
    ));
  };

  const handlePurchaseOrderSubmit = async (orderData: any) => {
    console.info("Purchase order received in Dashboard:", orderData);
    
    const amount = typeof orderData.amount === 'string' ? 
      parseFloat(orderData.amount) : orderData.amount;
    
    const dueDate = orderData.dueDate || new Date();
    const today = startOfDay(new Date());
    const dueDateStartOfDay = startOfDay(dueDate);
    
    // Only deduct cash if due date is today or in the past (for display purposes only)
    // Note: In a real Plaid integration, this would schedule/execute the payment
    if (dueDateStartOfDay <= today) {
      console.info("Due date is today or past - payment would be processed:", amount);
      console.info("Current bank balance:", bankAccountBalance);
    } else {
      console.info("Due date is in the future - payment scheduled for:", format(dueDate, "PPP"));
    }

    // Always create a separate vendor entry for each purchase order
    const paymentSchedule = orderData.paymentSchedule || [];
    // For due-upon-order, ensure due date is same as PO date
    let nextPaymentDate = orderData.paymentType === 'due-upon-order' ? orderData.poDate : orderData.dueDate;
    let nextPaymentAmount = amount;
    
    // For preorder, use first payment from schedule
    if (orderData.paymentType === 'preorder' && paymentSchedule.length > 0) {
      nextPaymentDate = paymentSchedule[0].dueDate;
      nextPaymentAmount = parseFloat(paymentSchedule[0].amount);
    }

    // Map form payment types to database payment types
    let dbPaymentType: 'total' | 'preorder' | 'net-terms' = 'total'; // default
    switch (orderData.paymentType) {
      case 'net-terms':
        dbPaymentType = 'net-terms';
        break;
      case 'preorder':
        dbPaymentType = 'preorder';
        break;
      case 'due-upon-order':
      case 'due-upon-delivery':
      default:
        dbPaymentType = 'total';
        break;
    }

    const vendor = await addVendor({
      name: orderData.vendor,
      totalOwed: amount,
      nextPaymentDate: nextPaymentDate || orderData.poDate || new Date(),
      nextPaymentAmount: nextPaymentAmount,
      status: 'upcoming',
      category: orderData.category || '',
      paymentType: dbPaymentType,
      netTermsDays: orderData.netTermsDays,
      poName: orderData.poName,
      description: orderData.description,
      notes: orderData.notes,
      paymentSchedule: paymentSchedule,
      source: 'management'  // Changed to 'management' so vendor appears in Vendor Management
    });

    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: `${orderData.poName} - ${orderData.vendor}`,
      vendorId: vendor?.id,
      transactionDate: new Date(),
      dueDate: orderData.dueDate,
      status: dueDateStartOfDay <= today ? 'completed' : 'pending'
    });

    // Don't create cash flow events since vendors automatically generate calendar events
    // This prevents duplication in the calendar

    // Refresh vendors to show updated data
    await refetchVendors();
    
    // Force immediate refresh for both components
    setTimeout(async () => {
      await refetchVendors();
    }, 200);
    
    setShowPurchaseOrderForm(false);
  };

  const handleEditIncome = (income: any) => {
    setEditingIncome(income);
    setShowEditIncomeForm(true);
  };

  const handleUpdateIncome = async (updatedIncomeData: any) => {
    const amount = typeof updatedIncomeData.amount === 'string' ? 
      parseFloat(updatedIncomeData.amount) : updatedIncomeData.amount;
    
    const paymentDate = updatedIncomeData.paymentDate || new Date();
    const today = startOfDay(new Date());
    const paymentDateStartOfDay = startOfDay(paymentDate);
    
    // Note: In a real Plaid integration, this would update connected account balances
    const success = await updateIncome(updatedIncomeData.id, {
      description: updatedIncomeData.description,
      amount,
      paymentDate,
      source: updatedIncomeData.source || 'Manual Entry',
      status: paymentDateStartOfDay <= today ? 'received' as const : 'pending' as const,
      category: updatedIncomeData.category,
      isRecurring: updatedIncomeData.isRecurring || false,
      recurringFrequency: updatedIncomeData.recurringFrequency,
      notes: updatedIncomeData.notes
    });

    if (success) {
      setShowEditIncomeForm(false);
      setEditingIncome(null);
    }
  };

  const handleIncomeSubmit = async (incomeData: any) => {
    const amount = typeof incomeData.amount === 'string' ? 
      parseFloat(incomeData.amount) : incomeData.amount;
    
    const paymentDate = incomeData.paymentDate || new Date();
    const today = startOfDay(new Date());
    const paymentDateStartOfDay = startOfDay(paymentDate);
    
    console.info("Adding income amount:", amount);
    console.info("Payment date:", paymentDate);
    console.info("Current bank balance:", bankAccountBalance);
    
    // Note: In a real Plaid integration, this would add funds to connected account

    // Add to database
    await addIncome({
      description: incomeData.description || 'Income',
      amount: amount,
      paymentDate: paymentDate,
      source: incomeData.source || 'Manual Entry',
      status: paymentDateStartOfDay <= today ? 'received' as const : 'pending' as const,
      category: incomeData.category || '',
      isRecurring: incomeData.isRecurring || false,
      recurringFrequency: incomeData.recurringFrequency,
      notes: incomeData.notes
    });

    // Create transaction
    await addTransaction({
      type: 'sales_order',
      amount: amount,
      description: incomeData.description || 'Income',
      transactionDate: paymentDate,
      status: paymentDateStartOfDay <= today ? 'completed' : 'pending'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'inflow',
      amount: amount,
      description: incomeData.description || 'Income',
      date: paymentDate
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleExpenseSubmit = async (expenseData: any) => {
    const amount = typeof expenseData.amount === 'string' ? 
      parseFloat(expenseData.amount) : expenseData.amount;
    
    console.info("Adding expense amount:", amount);
    console.info("Current bank balance:", bankAccountBalance);
    
    // Note: In a real Plaid integration, this would deduct from connected account

    // Create vendor for expense
    const newVendor = await addVendor({
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

    // Create transaction (link to the created vendor)
    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: expenseData.description || 'Expense',
      vendorId: newVendor?.id,
      transactionDate: expenseData.paymentDate || new Date(),
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'outflow',
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
    
    // Note: In a real Plaid integration, this would add funds to connected account

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
      type: 'inflow',
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

  const handleDeleteVendorOrder = async (vendor: Vendor) => {
    // Delete vendor and associated transactions
    await deleteVendor(vendor.id);
    
    // Remove any cash flow events associated with this vendor by name or PO name
    setCashFlowEvents(prev => prev.filter(event => 
      !(event.vendor === vendor.name || 
        event.description?.includes(vendor.name) ||
        (vendor.poName && event.description?.includes(vendor.poName)))
    ));
    
    setEditingVendor(null);
  };

  const handleEditTransaction = (transaction: any) => {
    console.log("Editing transaction:", transaction);
    
    // Route to appropriate edit form based on transaction type
    if (transaction.type === 'inflow') {
      // For income transactions, we need to find the corresponding income item
      const incomeItem = incomeItems.find(item => 
        item.description === transaction.description && 
        Math.abs(item.amount - transaction.amount) < 0.01
      );
      
      if (incomeItem) {
        // TODO: Open income edit form - for now, show alert
        handleEditIncome(incomeItem);
      } else {
        alert(`Income item not found for transaction: ${transaction.description}`);
      }
    } else if (transaction.type === 'purchase-order' || transaction.type === 'outflow' || transaction.vendor) {
      // For vendor transactions, find the corresponding vendor
      const vendor = vendors.find(v => 
        v.name === transaction.vendor || 
        transaction.description.includes(v.name) ||
        v.poName === transaction.poName
      );
      
      if (vendor) {
        setEditingVendor(vendor);
      } else {
        alert(`Vendor not found for transaction: ${transaction.description}`);
      }
    } else {
      alert(`Unknown transaction type: ${transaction.type}\nTransaction: ${transaction.description}`);
    }
  };


  const handleUpdateCashBalance = async () => {
    // This function syncs with real bank account balance from connected accounts
    console.log("Syncing cash balance - Bank account balance:", bankAccountBalance);
    console.log("Cash balance is now managed through Plaid integration");
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

  // No sample events for new users
  const sampleEvents: any[] = [];

  // Convert cash flow events to calendar format (no conversion needed since types now match)
  const calendarEvents = cashFlowEvents;

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

  // Clean up stale cash flow events when vendors change
  React.useEffect(() => {
    setCashFlowEvents(prev =>
      prev.filter(e => {
        if (!e.vendor) return true;
        
        // Check if vendor still exists by name
        const vendorExists = vendors.some(v => v.name === e.vendor);
        if (!vendorExists) return false; // vendor deleted
        
        // Check if vendor is fully paid
        const vendor = vendors.find(v => v.name === e.vendor);
        if (vendor && ((vendor.totalOwed ?? 0) <= 0 || vendor.status === 'paid')) {
          return false; // fully paid
        }
        
        return true;
      })
    );
  }, [vendors]);

  // Get credit card due date events only if user has real data (vendors or transactions)
  const hasRealData = vendors.length > 0 || transactions.length > 0;
  const creditCardEvents = hasRealData ? getCreditCardDueDates() : [];

  // Combine all events for calendar - only include real user data
  const allCalendarEvents = [...calendarEvents, ...vendorEvents, ...creditCardEvents];

  // Log cash values for debugging
  console.log("Dashboard - bankAccountBalance:", bankAccountBalance, "accounts connected:", accounts.length);
  
  // Calculate total transactions (income - expenses) - only count transactions on or before today
  const today = startOfDay(new Date());
  const transactionTotal = transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount);
    const transactionDate = startOfDay(transaction.transactionDate);
    
    // Only count transactions on or before today
    if (transactionDate > today) {
      return total;
    }
    
    // Income: customer_payment, sales_order
    // Expenses: purchase_order, vendor_payment
    const isIncome = transaction.type === 'customer_payment' || transaction.type === 'sales_order';
    return isIncome ? total + amount : total - amount;
  }, 0);
  
  // Display only the real bank account balance from Plaid
  const displayCash = bankAccountBalance;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DashboardHeader />
      
      <div className="p-6 space-y-6">
        <OverviewStats 
          totalCash={displayCash} 
          events={allCalendarEvents}
          onUpdateCashBalance={handleUpdateCashBalance}
        />
        
        {/* Row 1: Cash Flow Calendar (Full Width) */}
        <CashFlowCalendar 
          events={allCalendarEvents} 
          totalCash={displayCash}
          onEditTransaction={handleEditTransaction}
        />

        {/* Row 2: Vendors Overview and Income Overview (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorsOverview 
            onVendorUpdate={refetchVendors}
            onEditOrder={(vendor) => {
              console.log('Edit order for vendor:', vendor);
            }}
          />
          <IncomeOverview
            incomeItems={incomeItems}
            onCollectToday={handleCollectIncome}
            onEditIncome={handleEditIncome}
          />
        </div>

        {/* Row 3: Bank Accounts and Credit Cards (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankAccounts />
          <CreditCards />
        </div>

        {/* Row 5: Amazon Payouts (Full Width) */}
        {(vendors.length > 0 || transactions.length > 0) && <AmazonPayouts />}
      </div>

      <FloatingMenu
        onAddPurchaseOrder={handleOpenPurchaseOrderForm}
        onAddIncome={() => setShowIncomeForm(true)}
        onAddRecurringIncome={() => setShowRecurringIncomeForm(true)}
      />

      {showPurchaseOrderForm && (
        <PurchaseOrderForm
          vendors={formVendors}
          open={showPurchaseOrderForm}
          onOpenChange={setShowPurchaseOrderForm}
          onSubmitOrder={handlePurchaseOrderSubmit}
          onAddVendor={addVendor}
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

      {showEditIncomeForm && (
        <IncomeForm
          open={showEditIncomeForm}
          onOpenChange={setShowEditIncomeForm}
          onSubmitIncome={handleUpdateIncome}
          onSubmitExpense={handleExpenseSubmit}
          editingIncome={editingIncome}
        />
      )}

      {editingVendor && (
        <VendorOrderEditModal
          vendor={editingVendor as any}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onSave={handleSaveVendorOrder}
          onDelete={handleDeleteVendorOrder}
        />
      )}
    </div>
  );
};

export default Dashboard;