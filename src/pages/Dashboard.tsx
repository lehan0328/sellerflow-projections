import { useState } from "react";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { VendorForm } from "@/components/cash-flow/vendor-form";
import { CustomerForm } from "@/components/cash-flow/customer-form";
import { SalesOrderForm } from "@/components/cash-flow/sales-order-form";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { TransactionLog, Transaction } from "@/components/cash-flow/transaction-log";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: 'current' | 'overdue' | 'upcoming';
  category: string;
}

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  poName?: string;
  date: Date;
}

const Dashboard = () => {
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  
  // State for vendors used in forms
  const [formVendors, setFormVendors] = useState([
    { id: '1', name: 'Global Vendor Co.', paymentType: 'net-terms', netTermsDays: '30' },
    { id: '2', name: 'Amazon Advertising', paymentType: 'total' },
    { id: '3', name: 'Inventory Plus LLC', paymentType: 'preorder' },
    { id: '4', name: 'Packaging Solutions Inc.', paymentType: 'preorder' },
    { id: '5', name: 'Logistics Partners', paymentType: 'net-terms', netTermsDays: '60' }
  ]);

  // State for customers used in forms
  const [formCustomers, setFormCustomers] = useState([
    { id: '1', name: 'ABC Retail Co.', paymentTerms: 'net', netTermsDays: '30' },
    { id: '2', name: 'Direct Sales', paymentTerms: 'immediate' },
    { id: '3', name: 'Wholesale Partners LLC', paymentTerms: 'net', netTermsDays: '45' },
    { id: '4', name: 'B2B Solutions Inc.', paymentTerms: 'net', netTermsDays: '60' }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: '1',
      name: 'Global Vendor Co.',
      totalOwed: 28500,
      nextPaymentDate: new Date(2024, 0, 18),
      nextPaymentAmount: 8500,
      status: 'upcoming',
      category: 'Inventory'
    },
    {
      id: '2',
      name: 'Amazon Advertising',
      totalOwed: 3200,
      nextPaymentDate: new Date(2024, 0, 25),
      nextPaymentAmount: 3200,
      status: 'current',
      category: 'Marketing'
    },
    {
      id: '3',
      name: 'Packaging Solutions Inc.',
      totalOwed: 5400,
      nextPaymentDate: new Date(2024, 0, 12),
      nextPaymentAmount: 2700,
      status: 'overdue',
      category: 'Packaging'
    },
    {
      id: '4',
      name: 'Logistics Partners',
      totalOwed: 1800,
      nextPaymentDate: new Date(2024, 0, 28),
      nextPaymentAmount: 1800,
      status: 'upcoming',
      category: 'Shipping'
    }
  ]);
  
  const [totalCash, setTotalCash] = useState(145750); // Initial cash amount
  
  const [events, setEvents] = useState<CashFlowEvent[]>([
    {
      id: '1',
      type: 'inflow',
      amount: 25000,
      description: 'Amazon Payout',
      date: new Date(2024, 0, 15)
    },
    {
      id: '2',
      type: 'purchase-order',
      amount: 8500,
      description: 'Inventory Purchase',
      vendor: 'Global Vendor Co.',
      poName: 'Q1 Inventory Restock',
      date: new Date(2024, 0, 18)
    },
    {
      id: '3',
      type: 'inflow',
      amount: 28000,
      description: 'Amazon Payout',
      date: new Date(2024, 0, 30)
    },
    {
      id: '4',
      type: 'purchase-order',
      amount: 3200,
      description: 'PPC Campaign',
      vendor: 'Amazon Advertising',
      poName: 'January PPC Budget',
      date: new Date(2024, 0, 25)
    },
    {
      id: '5',
      type: 'credit-payment',
      amount: 2500,
      description: 'Chase Sapphire Payment Due',
      creditCard: 'Chase Sapphire Business',
      date: new Date(2024, 0, 22)
    },
    {
      id: '6',
      type: 'credit-payment',
      amount: 1800,
      description: 'American Express Payment Due',
      creditCard: 'Amex Gold Business',
      date: new Date(2024, 0, 28)
    },
    {
      id: '7',
      type: 'inflow',
      amount: 32000,
      description: 'Amazon Payout',
      date: new Date(2024, 1, 14)
    },
    {
      id: '8',
      type: 'purchase-order',
      amount: 12000,
      description: 'Inventory Restock',
      vendor: 'Inventory Plus LLC',
      poName: 'February Bulk Order',
      date: new Date(2024, 1, 5)
    }
  ]);

  const handlePayToday = (vendor: Vendor, amount?: number) => {
    const paymentAmount = amount || vendor.nextPaymentAmount;
    console.log("Pay today called for vendor:", vendor.name, "amount:", paymentAmount);
    
    // Deduct from total cash
    console.log("Previous total cash:", totalCash);
    setTotalCash(prev => {
      const newTotal = prev - paymentAmount;
      console.log("New total cash after payment:", newTotal);
      return newTotal;
    });
    
    // Add new event for today's payment
    const newEvent: CashFlowEvent = {
      id: `payment-${vendor.id}-${Date.now()}`,
      type: 'purchase-order',
      amount: paymentAmount,
      description: `Payment to ${vendor.name}`,
      vendor: vendor.name,
      date: new Date()
    };
    
    // Add transaction to log
    const newTransaction: Transaction = {
      id: `transaction-${vendor.id}-${Date.now()}`,
      type: 'payment',
      vendor: vendor.name,
      amount: paymentAmount,
      description: `Payment to ${vendor.name}`,
      date: new Date(),
      status: 'completed'
    };
    
    console.log("Adding event and transaction for payment");
    setEvents(prev => [...prev, newEvent]);
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleUndoTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Add back to total cash if it was a payment
    if (transaction.type === 'payment') {
      setTotalCash(prev => prev + transaction.amount);
    }

    // Remove the transaction
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
    
    // Remove corresponding event
    setEvents(prev => prev.filter(e => 
      !(e.description === transaction.description && 
        Math.abs(e.date.getTime() - transaction.date.getTime()) < 1000)
    ));
    
    // If it was a payment, restore the amount to the original vendor
    if (transaction.type === 'payment' && transaction.vendor) {
      const existingVendor = vendors.find(v => v.name === transaction.vendor);
      if (existingVendor) {
        // Add amount back to existing vendor's total owed
        const updatedVendor = {
          ...existingVendor,
          totalOwed: existingVendor.totalOwed + transaction.amount,
          nextPaymentAmount: Math.min(existingVendor.nextPaymentAmount + transaction.amount, existingVendor.totalOwed + transaction.amount)
        };
        const updatedVendors = vendors.map(v => v.id === existingVendor.id ? updatedVendor : v);
        setVendors(updatedVendors);
        handleVendorUpdate(updatedVendors);
      } else {
        // Restore vendor if it was completely removed after full payment
        const restoredVendor: Vendor = {
          id: `restored-${Date.now()}`,
          name: transaction.vendor,
          totalOwed: transaction.amount,
          nextPaymentDate: new Date(),
          nextPaymentAmount: transaction.amount,
          status: 'current',
          category: 'Restored'
        };
        const updatedVendors = [...vendors, restoredVendor];
        setVendors(updatedVendors);
        handleVendorUpdate(updatedVendors);
      }
    }
  };

  const handleVendorUpdate = (updatedVendors: Vendor[]) => {
    setVendors(updatedVendors);
  };

  // Handle purchase order submission
  const handlePurchaseOrderSubmit = (orderData: any) => {
    console.log("Purchase order received in Dashboard:", orderData);
    const amount = parseFloat(orderData.amount);
    console.log("Deducting cash amount:", amount);
    
    // Deduct from total cash if payment is immediate
    if (orderData.paymentType === 'total') {
      console.log("Previous total cash:", totalCash);
      setTotalCash(prev => {
        const newTotal = prev - amount;
        console.log("New total cash:", newTotal);
        return newTotal;
      });
    }
    
    // Create new cash flow event
    const newEvent: CashFlowEvent = {
      id: `po-${Date.now()}`,
      type: 'purchase-order',
      amount: amount,
      description: orderData.description,
      vendor: orderData.vendor,
      poName: orderData.poName,
      date: orderData.dueDate || new Date()
    };
    
    setEvents(prev => [...prev, newEvent]);
  };

  // Handle sales order submission
  const handleSalesOrderSubmit = (orderData: any) => {
    console.log("Sales order received in Dashboard:", orderData);
    console.log("Payment type:", orderData.paymentType);
    const amount = parseFloat(orderData.amount);
    console.log("Adding cash amount:", amount);
    
    // Add to total cash if payment is immediate (checking both 'total' and 'immediate')
    if (orderData.paymentType === 'total' || orderData.paymentType === 'immediate') {
      console.log("Previous total cash:", totalCash);
      setTotalCash(prev => {
        const newTotal = prev + amount;
        console.log("New total cash:", newTotal);
        return newTotal;
      });
    } else {
      console.log("Not adding cash - payment type is:", orderData.paymentType);
    }
    
    // Create new cash flow event
    const newEvent: CashFlowEvent = {
      id: `so-${Date.now()}`,
      type: 'inflow',
      amount: amount,
      description: orderData.description,
      date: orderData.dueDate || new Date()
    };
    
    setEvents(prev => [...prev, newEvent]);
  };

  // Add vendor order editing functionality
  const [editingVendorOrder, setEditingVendorOrder] = useState<Vendor | null>(null);
  
  const handleEditVendorOrder = (vendor: Vendor) => {
    console.log('handleEditVendorOrder called with vendor:', vendor);
    setEditingVendorOrder(vendor);
    console.log('editingVendorOrder state should be set to:', vendor);
  };

  const handleSaveVendorOrder = (updatedVendor: Vendor) => {
    const updatedVendors = vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v);
    setVendors(updatedVendors);
    handleVendorUpdate(updatedVendors);
    setEditingVendorOrder(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Andy" />
      
      <FloatingMenu 
        onAddVendor={() => setShowVendorForm(true)}
        onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)}
        onAddSalesOrder={() => setShowSalesOrderForm(true)}
        onAddCustomer={() => setShowCustomerForm(true)}
      />
      
      <div className="container mx-auto px-4 pb-8 space-y-8">
        <OverviewStats totalCash={totalCash} events={events} />
        
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CashFlowCalendar 
              events={events}
              totalCash={totalCash}
            />
          </div>
          <div className="lg:col-span-1">
            <VendorsOverview 
              vendors={vendors}
              onPayToday={handlePayToday} 
              onVendorUpdate={handleVendorUpdate}
              onEditOrder={handleEditVendorOrder}
            />
          </div>
        </div>
        
        <TransactionLog 
          transactions={transactions}
          onUndoTransaction={handleUndoTransaction}
        />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <BankAccounts />
          <CreditCards />
        </div>
        
        <AmazonPayouts />
      </div>
      
      <PurchaseOrderForm 
        open={showPurchaseOrderForm}
        onOpenChange={setShowPurchaseOrderForm}
        vendors={formVendors}
        onSubmitOrder={handlePurchaseOrderSubmit}
      />
      
      <CustomerForm
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        onAddCustomer={(customer) => {
          const newCustomers = [...formCustomers, customer];
          setFormCustomers(newCustomers);
        }}
      />
      
      <SalesOrderForm
        open={showSalesOrderForm}
        onOpenChange={setShowSalesOrderForm}
        customers={formCustomers}
        onSubmitOrder={handleSalesOrderSubmit}
      />
      
      <VendorOrderEditModal
        vendor={editingVendorOrder}
        open={!!editingVendorOrder}
        onOpenChange={(open) => {
          console.log('VendorOrderEditModal onOpenChange called with:', open);
          if (!open) {
            console.log('Closing modal, setting editingVendorOrder to null');
            setEditingVendorOrder(null);
          }
        }}
        onSave={handleSaveVendorOrder}
      />
    </div>
  );
};

export default Dashboard;