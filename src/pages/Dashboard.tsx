import React, { useState, useMemo } from "react";
import { addDays, isToday, isBefore, startOfDay } from "date-fns";
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
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserSettings } from "@/hooks/useUserSettings";
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
  
  // Use database hooks
  const { vendors, addVendor, updateVendor, deleteVendor, refetch: refetchVendors } = useVendors();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { totalCash, updateTotalCash } = useUserSettings();
  const { totalBalance: bankAccountBalance } = useBankAccounts();
  
  // State for vendors used in forms (derived from database vendors) - always fresh data
  const formVendors = useMemo(() => vendors.map(v => ({ 
    id: v.id, 
    name: v.name, 
    paymentType: v.paymentType || 'total',
    netTermsDays: (v.netTermsDays ?? '30') as any,
    category: v.category || "",
    source: v.source || 'unknown'
  })), [vendors]); // Recompute when vendors change
  
  // Force refresh vendors when opening Purchase Order form to ensure fresh data
  const handleOpenPurchaseOrderForm = () => {
    refetchVendors(); // Ensure we have the latest vendor data
    setShowPurchaseOrderForm(true);
  };

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

  // No sample data for new users

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

    // Restore cash based on transaction type
    if (transaction.type === 'purchase_order') {
      await updateTotalCash(totalCash + transaction.amount);
      
      // Reduce vendor's total owed when purchase order is deleted
      if (transaction.vendorId) {
        const vendor = vendors.find(v => v.id === transaction.vendorId);
        if (vendor) {
          const newTotalOwed = Math.max(0, vendor.totalOwed - transaction.amount);
          await updateVendor(vendor.id, { 
            totalOwed: newTotalOwed,
            status: newTotalOwed === 0 ? 'paid' : vendor.status
          });
        }
      }
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
    
    console.info("Deducting cash amount:", amount);
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash - amount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

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
      status: 'completed'
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

  const handleIncomeSubmit = async (incomeData: any) => {
    const amount = typeof incomeData.amount === 'string' ? 
      parseFloat(incomeData.amount) : incomeData.amount;
    
    const paymentDate = incomeData.paymentDate || new Date();
    const today = startOfDay(new Date());
    const paymentDateStartOfDay = startOfDay(paymentDate);
    
    console.info("Adding income amount:", amount);
    console.info("Payment date:", paymentDate);
    console.info("Previous total cash:", totalCash);
    
    // Only update total cash if payment date is today or in the past
    if (isToday(paymentDate) || isBefore(paymentDateStartOfDay, today)) {
      const newTotalCash = totalCash + amount;
      await updateTotalCash(newTotalCash);
      console.info("Updated total cash to:", newTotalCash);
    } else {
      console.info("Future-dated income - not updating total cash immediately");
    }

    // Add to income items
    const newIncomeItem = {
      ...incomeData,
      id: Date.now().toString(),
      amount: amount,
      paymentDate: paymentDate,
      status: 'received' as const
    };
    setIncomeItems(prev => [newIncomeItem, ...prev]);

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
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash - amount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

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
        alert(`Edit Income: ${incomeItem.description}\nAmount: $${incomeItem.amount}\nDate: ${incomeItem.paymentDate.toLocaleDateString()}`);
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
    // Use real bank account balance from connected accounts
    console.log("Syncing cash balance - Bank account balance:", bankAccountBalance);
    console.log("Previous total cash:", totalCash);
    await updateTotalCash(bankAccountBalance);
    console.log("Cash balance updated to bank account balance");
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

  // Get credit card due date events
  const creditCardEvents = getCreditCardDueDates();

  // Combine all events for calendar
  const allCalendarEvents = [...sampleEvents, ...calendarEvents, ...vendorEvents, ...creditCardEvents];

  // Log cash values for debugging
  console.log("Dashboard - totalCash:", totalCash, "bankAccountBalance:", bankAccountBalance, "final cash value:", totalCash || bankAccountBalance);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DashboardHeader />
      <div className="p-6 space-y-6">
        <OverviewStats 
          totalCash={totalCash || bankAccountBalance} 
          events={allCalendarEvents}
          onUpdateCashBalance={handleUpdateCashBalance}
        />
        
        {/* Row 1: Cash Flow Calendar (Full Width) */}
        <CashFlowCalendar 
          events={allCalendarEvents} 
          totalCash={totalCash || bankAccountBalance}
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
            onIncomeUpdate={setIncomeItems}
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