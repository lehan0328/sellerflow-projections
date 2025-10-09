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
  const {
    totalBalance: bankBalance
  } = useBankAccounts();
  const {
    totalAvailableCredit,
    creditCards
  } = useCreditCards();
  const {
    data: safeSpendingData
  } = useSafeSpending();
  const {
    vendors
  } = useVendors();
  const {
    incomeItems
  } = useIncome();
  const {
    transactions
  } = useTransactions();

  // Calculate metrics
  const today = startOfDay(new Date());
  const next30Days = addDays(today, 30);

  // Total upcoming purchase orders (pending transactions)
  const upcomingPurchaseOrders = transactions.filter(tx => tx.type === 'purchase_order' && tx.status === 'pending' && tx.dueDate && isWithinInterval(new Date(tx.dueDate), {
    start: today,
    end: next30Days
  })).reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Total vendor payments scheduled
  const upcomingVendorPayments = vendors.filter(v => v.status !== 'paid' && Number(v.totalOwed || 0) > 0).reduce((sum, v) => sum + Number(v.totalOwed || 0), 0);

  // Upcoming income (next 30 days)
  const upcomingIncome = incomeItems.filter(income => income.status !== 'received' && income.paymentDate && isWithinInterval(new Date(income.paymentDate), {
    start: today,
    end: next30Days
  })).reduce((sum, income) => sum + Number(income.amount), 0);

  // Credit utilization
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + Number(card.credit_limit || 0), 0);
  const totalCreditBalance = creditCards.reduce((sum, card) => sum + Number(card.balance || 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? totalCreditBalance / totalCreditLimit * 100 : 0;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  const handleDownload = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
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
          logging: false
        });
        canvas.toBlob(async blob => {
          if (blob) {
            const file = new File([blob], 'auren-flex-report.png', {
              type: 'image/png'
            });
            await navigator.share({
              title: 'My Financial Report - Powered by Auren',
              text: 'Check out my financial metrics!',
              files: [file]
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
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button onClick={handleShare} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Flex Report Card */}
        <Card ref={reportRef} className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 shadow-2xl border-0 backdrop-blur-sm">
          {/* Background Gradient Decoration */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/20 to-blue-400/20 rounded-full blur-3xl -z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-emerald-400/10 to-blue-400/10 rounded-full blur-3xl -z-0" />
          
          {/* Auren Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img src={aurenLogo} alt="" className="w-[600px] opacity-[0.08] select-none rotate-[-15deg] scale-110" />
          </div>
          
          <div className="relative z-10 p-8 md:p-12">
            {/* Header with Branding */}
            <div className="flex items-center justify-between mb-10 pb-8 border-b-2 border-gradient-to-r from-blue-200 via-purple-200 to-blue-200">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-3 tracking-tight">
                  Financial Power Report
                </h1>
                <p className="text-slate-600 text-lg">Your business at a glance</p>
              </div>
              <img src={aurenLogo} alt="Auren" className="h-16 md:h-20 drop-shadow-lg" />
            </div>

            {/* Primary Metric - Available to Spend */}
            <div className="mb-10 text-center bg-gradient-to-br from-emerald-50/50 to-green-50/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-emerald-300/70 shadow-2xl relative overflow-hidden">
              {/* Verification Badge Overlay */}
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border-2 border-emerald-500/50 shadow-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live Verified</span>
              </div>
              
              <p className="text-sm text-slate-600 mb-3 uppercase tracking-widest font-semibold">Available to Spend</p>
              
              {/* Amount with Lock Icon */}
              <div className="relative inline-block">
                <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 drop-shadow-sm">
                  {formatCurrency(safeSpendingData?.safe_spending_limit || 0)}
                </div>
              </div>
              
              <p className="text-slate-600 text-base font-medium mb-4">Safe spending power for your business</p>
              
              {/* Verification Footer */}
              <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-emerald-200/50">
                <div className="flex items-center gap-2 bg-emerald-100/50 px-4 py-2 rounded-lg border border-emerald-300/50">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Verified by Live Bank Account</span>
                </div>
              </div>
              
              {/* Security Pattern Background */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)', color: '#10b981'}}></div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              {/* Future Purchasing Opportunities */}
              <div className="group bg-gradient-to-br from-blue-50 via-blue-100/80 to-blue-50 rounded-2xl p-6 border-2 border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Purchasing Power</p>
                </div>
                <p className="text-4xl font-black text-blue-700 drop-shadow-sm">{formatCurrency(bankBalance)}</p>
              </div>

              {/* Available Credit */}
              <div className="group bg-gradient-to-br from-purple-50 via-purple-100/80 to-purple-50 rounded-2xl p-6 border-2 border-purple-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Available Credit</p>
                </div>
                <p className="text-4xl font-black text-purple-700 drop-shadow-sm">{formatCurrency(totalAvailableCredit)}</p>
              </div>

              {/* Upcoming Income */}
              <div className="group bg-gradient-to-br from-emerald-50 via-emerald-100/80 to-emerald-50 rounded-2xl p-6 border-2 border-emerald-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Income (30d)</p>
                </div>
                <p className="text-4xl font-black text-emerald-700 drop-shadow-sm">{formatCurrency(upcomingIncome)}</p>
              </div>

              {/* Purchase Orders */}
              <div className="group bg-gradient-to-br from-orange-50 via-orange-100/80 to-orange-50 rounded-2xl p-6 border-2 border-orange-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Purchase Orders</p>
                </div>
                <p className="text-4xl font-black text-orange-700 drop-shadow-sm">{formatCurrency(upcomingPurchaseOrders)}</p>
              </div>
            </div>

            {/* Additional Metrics Row */}
            <div className="grid grid-cols-2 gap-5 mb-10">
              {/* Credit Utilization */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border-2 border-slate-200/60 shadow-md backdrop-blur-sm">
                <p className="text-xs text-slate-600 mb-2 font-semibold uppercase tracking-wide">Credit Utilization</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-700">{creditUtilization.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 font-medium">of {formatCurrency(totalCreditLimit)}</p>
                </div>
              </div>

              {/* Vendor Payments */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border-2 border-slate-200/60 shadow-md backdrop-blur-sm">
                <p className="text-xs text-slate-600 mb-2 font-semibold uppercase tracking-wide">Scheduled Vendor Payments</p>
                <p className="text-3xl font-black text-slate-700">{formatCurrency(upcomingVendorPayments)}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t-2 border-gradient-to-r from-slate-200 via-slate-300 to-slate-200">
              <div className="flex items-center justify-between text-sm mb-4">
                <p className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Generated {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
                </p>
                <div className="text-right">
                  <p className="text-slate-700 font-semibold text-base mb-1">
                    Powered by <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent font-black text-lg">Auren</span>
                  </p>
                  <p className="text-xs text-slate-500 italic font-medium">Cash Flow Management For Amazon Sellers</p>
                </div>
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
    </div>;
};
export default FlexReport;