import React, { useState } from "react";
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
import { CustomerForm } from "@/components/cash-flow/customer-form";
import { SalesOrderForm } from "@/components/cash-flow/sales-order-form";
import { VendorForm } from "@/components/cash-flow/vendor-form";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserSettings } from "@/hooks/useUserSettings";

// ========== Type Definitions ==========

interface CashFlowEvent {
  type: 'income' | 'expense' | 'vendor_payment';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  date: Date;
}

const Dashboard = () => {
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  
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

  // State for customers used in forms
  const [formCustomers, setFormCustomers] = useState([
    { id: '1', name: 'ABC Retail Co.', paymentTerms: 'net', netTermsDays: '30' },
    { id: '2', name: 'Direct Sales', paymentTerms: 'immediate' },
    { id: '3', name: 'Wholesale Partners LLC', paymentTerms: 'net', netTermsDays: '45' },
    { id: '4', name: 'B2B Solutions Inc.', paymentTerms: 'net', netTermsDays: '60' }
  ]);

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

    // Find vendor by name and create transaction
    const vendor = vendors.find(v => v.name === orderData.vendor);
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
      type: 'expense',
      amount: amount,
      description: `${orderData.poName} - ${orderData.vendor}`,
      vendor: orderData.vendor,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowPurchaseOrderForm(false);
  };

  const handleSalesOrderSubmit = async (orderData: any) => {
    const amount = typeof orderData.amount === 'string' ? 
      parseFloat(orderData.amount) : orderData.amount;
    
    console.info("Payment type:", orderData.paymentType);
    console.info("Adding cash amount:", amount);
    console.info("Previous total cash:", totalCash);
    
    const newTotalCash = totalCash + amount;
    await updateTotalCash(newTotalCash);
    
    console.info("New total cash:", newTotalCash);

    // Create transaction
    await addTransaction({
      type: 'sales_order',
      amount: amount,
      description: `${orderData.soName} - ${orderData.customer}`,
      transactionDate: new Date(),
      dueDate: orderData.dueDate,
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      type: 'income',
      amount: amount,
      description: `${orderData.soName} - ${orderData.customer}`,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowSalesOrderForm(false);
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

  // Sample cash flow events for calendar visualization
  const sampleEvents = [
    {
      id: '1',
      type: 'income' as const,
      amount: 25000,
      description: 'Amazon Payout',
      date: new Date()
    },
    {
      id: '2', 
      type: 'expense' as const,
      amount: 8500,
      description: 'Inventory Purchase',
      vendor: 'Global Vendor Co.',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DashboardHeader />
      <div className="p-6 space-y-6">
        <OverviewStats totalCash={totalCash} />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <CashFlowCalendar events={[...sampleEvents, ...cashFlowEvents]} totalCash={totalCash} />
            <VendorsOverview 
              vendors={vendors}
              onPayToday={handlePayToday}
              onEditOrder={handleEditVendorOrder}
            />
            <TransactionLog 
              transactions={transactions}
              onUndoTransaction={handleUndoTransaction}
            />
          </div>
          
          <div className="space-y-6">
            <BankAccounts />
            <CreditCards />
            <AmazonPayouts />
          </div>
        </div>
      </div>

      <FloatingMenu
        onAddVendor={() => setShowVendorForm(true)}
        onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)}
        onAddCustomer={() => setShowCustomerForm(true)}
        onAddSalesOrder={() => setShowSalesOrderForm(true)}
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

      {showCustomerForm && (
        <CustomerForm
          open={showCustomerForm}
          onOpenChange={setShowCustomerForm}
          onAddCustomer={(customerData) => {
            setFormCustomers(prev => [...prev, { ...customerData, id: Date.now().toString() }]);
          }}
        />
      )}

      {showSalesOrderForm && (
        <SalesOrderForm
          customers={formCustomers}
          open={showSalesOrderForm}
          onOpenChange={setShowSalesOrderForm}
          onSubmit={handleSalesOrderSubmit}
        />
      )}

      {editingVendor && (
        <VendorOrderEditModal
          vendor={editingVendor}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onSave={handleSaveVendorOrder}
        />
      )}
    </div>
  );
};

export default Dashboard;