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
import { AddAccountModal } from "@/components/cash-flow/add-account-modal";

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
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  
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

  const handlePayToday = (vendor: Vendor) => {
    // Add new event for today's payment
    const newEvent: CashFlowEvent = {
      id: `payment-${vendor.id}-${Date.now()}`,
      type: 'purchase-order',
      amount: vendor.nextPaymentAmount,
      description: `Payment to ${vendor.name}`,
      vendor: vendor.name,
      date: new Date()
    };
    
    setEvents(prev => [...prev, newEvent]);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Andy" />
      
      <FloatingMenu 
        onAddVendor={() => setShowVendorForm(true)}
        onAddAccount={() => setShowAddAccountModal(true)}
      />
      
      <div className="container mx-auto px-4 pb-8 space-y-8">
        <OverviewStats />
        
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CashFlowCalendar 
              onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)} 
              events={events}
            />
          </div>
          <div className="lg:col-span-1">
            <VendorsOverview onPayToday={handlePayToday} />
          </div>
        </div>
        
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
      
      <AddAccountModal
        open={showAddAccountModal}
        onOpenChange={setShowAddAccountModal}
      />
    </div>
  );
};

export default Dashboard;