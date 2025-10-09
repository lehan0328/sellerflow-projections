import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2, TrendingUp, DollarSign, CreditCard, ShoppingCart, Calendar, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSafeSpending } from "@/hooks/useSafeSpending";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { addDays, isWithinInterval, startOfDay } from "date-fns";
import aurenLogo from "@/assets/auren-full-logo.png";

const FlexReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { totalBalance: bankBalance } = useBankAccounts();
  const { totalAvailableCredit, creditCards } = useCreditCards();
  const { data: safeSpendingData } = useSafeSpending();
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions } = useTransactions();

  // Calculate metrics
  const today = startOfDay(new Date());
  const next30Days = addDays(today, 30);
  
  // Total upcoming purchase orders (pending transactions)
  const upcomingPurchaseOrders = transactions
    .filter(tx => 
      tx.type === 'purchase_order' && 
      tx.status === 'pending' &&
      tx.dueDate &&
      isWithinInterval(new Date(tx.dueDate), { start: today, end: next30Days })
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Total vendor payments scheduled
  const upcomingVendorPayments = vendors
    .filter(v => v.status !== 'paid' && Number(v.totalOwed || 0) > 0)
    .reduce((sum, v) => sum + Number(v.totalOwed || 0), 0);

  // Upcoming income (next 30 days)
  const upcomingIncome = incomeItems
    .filter(income => 
      income.status !== 'received' &&
      income.paymentDate &&
      isWithinInterval(new Date(income.paymentDate), { start: today, end: next30Days })
    )
    .reduce((sum, income) => sum + Number(income.amount), 0);

  // Credit utilization
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + Number(card.credit_limit || 0), 0);
  const totalCreditBalance = creditCards.reduce((sum, card) => sum + Number(card.balance || 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `auren-flex-report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share && reportRef.current) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(reportRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'auren-flex-report.png', { type: 'image/png' });
            await navigator.share({
              title: 'My Financial Report - Powered by Auren',
              text: 'Check out my financial metrics!',
              files: [file],
            });
          }
        });
      } catch (error) {
        console.error('Error sharing:', error);
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Flex Report Card */}
        <Card 
          ref={reportRef}
          className="relative overflow-hidden bg-white shadow-2xl border-0"
        >
          {/* Background Gradient Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -z-0" />
          
          <div className="relative z-10 p-8 md:p-12">
            {/* Header with Branding */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Financial Power Report
                </h1>
                <p className="text-slate-600">Your business at a glance</p>
              </div>
              <img src={aurenLogo} alt="Auren" className="h-8 md:h-10" />
            </div>

            {/* Primary Metric - Available to Spend */}
            <div className="mb-8 text-center">
              <p className="text-sm text-slate-600 mb-2 uppercase tracking-wide">Available to Spend</p>
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                {formatCurrency(safeSpendingData?.safe_spending_limit || 0)}
              </div>
              <p className="text-slate-500 text-sm">Safe spending power for your business</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Total Cash */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Total Cash</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{formatCurrency(bankBalance)}</p>
              </div>

              {/* Available Credit */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Available Credit</p>
                </div>
                <p className="text-3xl font-bold text-purple-700">{formatCurrency(totalAvailableCredit)}</p>
              </div>

              {/* Upcoming Income */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Income (30d)</p>
                </div>
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(upcomingIncome)}</p>
              </div>

              {/* Purchase Orders */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Purchase Orders</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">{formatCurrency(upcomingPurchaseOrders)}</p>
              </div>
            </div>

            {/* Additional Metrics Row */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Credit Utilization */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Credit Utilization</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-700">{creditUtilization.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">of {formatCurrency(totalCreditLimit)}</p>
                </div>
              </div>

              {/* Vendor Payments */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Scheduled Vendor Payments</p>
                <p className="text-2xl font-bold text-slate-700">{formatCurrency(upcomingVendorPayments)}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <p className="text-slate-500">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Generated {new Date().toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
                <p className="text-slate-600 font-medium">
                  Powered by <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">Auren</span>
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-600">
            Share your success with the world! Download or share this report to showcase your business growth.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlexReport;
