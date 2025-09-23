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
    
    setEvents(prev => [...prev, newEvent]);
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleUndoTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

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
        onAddSalesOrder={() => {
          // TODO: Implement sales order functionality
          toast.info('Sales Order functionality coming soon!');
        }}
        onAddCustomer={() => {
          // TODO: Implement add customer functionality  
          toast.info('Add Customer functionality coming soon!');
        }}
      />
      
      <div className="container mx-auto px-4 pb-8 space-y-8">
        <OverviewStats />
        
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CashFlowCalendar 
              events={events}
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
      />
      
      <VendorForm 
        open={showVendorForm}
        onOpenChange={setShowVendorForm}
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