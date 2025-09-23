import { useState } from "react";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { SuppliersOverview } from "@/components/cash-flow/suppliers-overview";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";

const Dashboard = () => {
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        <OverviewStats />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <BankAccounts />
          <CreditCards />
        </div>
        
        <AmazonPayouts />
        
        <CashFlowCalendar onAddPurchaseOrder={() => setShowPurchaseOrderForm(true)} />
        
        <SuppliersOverview />
      </div>
      
      <PurchaseOrderForm 
        open={showPurchaseOrderForm} 
        onOpenChange={setShowPurchaseOrderForm} 
      />
    </div>
  );
};

export default Dashboard;