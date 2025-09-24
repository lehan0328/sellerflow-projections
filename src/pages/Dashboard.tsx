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
import { DraggableGrid } from "@/components/ui/draggable-grid";
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

    // Create transaction
    await addTransaction({
      type: 'sales_order',
      amount: amount,
      description: incomeData.description || 'Income',
      transactionDate: new Date(),
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'income',
      amount: amount,
      description: incomeData.description || 'Income',
      source: incomeData.source,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowIncomeForm(false);
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

  // Sample cash flow events for calendar visualization with Amazon payouts
  const sampleEvents = [
    {
      id: '1',
      type: 'inflow' as const,
      amount: 25000,
      description: 'Amazon Payout',
      source: 'amazon',
      date: new Date()
    },
    {
      id: '2', 
      type: 'outflow' as const,
      amount: 8500,
      description: 'Inventory Purchase',
      vendor: 'Global Vendor Co.',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      type: 'inflow' as const,
      amount: 32000,
      description: 'Amazon Payout - Holiday Sales',
      source: 'amazon',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: '4',
      type: 'inflow' as const,
      amount: 18500,
      description: 'Amazon Payout - Q1 Performance',
      source: 'amazon',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  ];

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

  // Convert vendor due dates to calendar events
  const vendorDueDateEvents = activeVendors.map(vendor => ({
    id: `vendor-${vendor.id}`,
    type: 'outflow' as const,
    amount: vendor.nextPaymentAmount,
    description: `${vendor.name} - ${vendor.poName || 'Payment Due'}`,
    vendor: vendor.name,
    date: vendor.nextPaymentDate
  }));

  // Combine all events for calendar
  const allCalendarEvents = [...sampleEvents, ...calendarEvents, ...vendorDueDateEvents];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DashboardHeader />
      <div className="p-6 space-y-6">
        <OverviewStats totalCash={totalCash} />
        
        <DraggableGrid
          items={[
            {
              id: 'cash-flow-calendar',
              content: <CashFlowCalendar events={allCalendarEvents} totalCash={totalCash} />,
              width: 800,
              height: 400
            },
            {
              id: 'transaction-log',
              content: <TransactionLog 
                transactions={formattedTransactions}
                onUndoTransaction={handleUndoTransaction}
              />,
              width: 800,
              height: 350
            },
            {
              id: 'vendors-overview',
              content: <VendorsOverview 
                vendors={activeVendors as any}
                onPayToday={handlePayToday}
                onEditOrder={handleEditVendorOrder}
              />,
              width: 400,
              height: 400
            },
            {
              id: 'bank-accounts',
              content: <BankAccounts />,
              width: 400,
              height: 300
            },
            {
              id: 'credit-cards',
              content: <CreditCards />,
              width: 400,
              height: 300
            },
            {
              id: 'amazon-payouts',
              content: <AmazonPayouts />,
              width: 400,
              height: 300
            }
          ]}
        />
      </div>

      <FloatingMenu
        onAddVendor={() => setShowVendorForm(true)}
        onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)}
        onAddIncome={() => setShowIncomeForm(true)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Add Income</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleIncomeSubmit({
                amount: parseFloat(formData.get('amount') as string),
                description: formData.get('description') as string,
                source: formData.get('source') as string
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    name="description"
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Income description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source (optional)</label>
                  <select name="source" className="w-full px-3 py-2 border rounded-md">
                    <option value="">Select source</option>
                    <option value="amazon">Amazon</option>
                    <option value="sales">Direct Sales</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                  >
                    Add Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIncomeForm(false)}
                    className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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