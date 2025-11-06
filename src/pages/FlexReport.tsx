import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2, TrendingUp, DollarSign, CreditCard, ShoppingCart, Calendar, ArrowLeft, Eye, EyeOff, Lock, BadgeCheck, Users, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSafeSpending } from "@/hooks/useSafeSpending";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { useExcludeToday } from "@/contexts/ExcludeTodayContext";
import { useReserveAmount } from "@/hooks/useReserveAmount";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAmazonRevenue } from "@/hooks/useAmazonRevenue";
import { addDays, isWithinInterval, startOfDay } from "date-fns";
import aurenLogo from "@/assets/auren-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const FlexReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Check user role - staff cannot access flex report
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.role;
    },
    enabled: !!user?.id,
  });

  // Redirect staff users
  React.useEffect(() => {
    if (userRole === 'staff') {
      toast({
        title: "Access Restricted",
        description: "Staff members cannot access the Flex Report.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [userRole, navigate, toast]);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Visibility toggles for each metric
  const [visibility, setVisibility] = useState({
    safeSpending: true,
    totalCash: true,
    availableCredit: true,
    upcomingIncome: true,
    purchaseOrders: true,
    creditUtilization: true,
    vendorPayments: true,
    vendorCount: true,
    amazonRevenue: true,
    totalPayouts: true,
    payoutGrowthRate: true
  });

  const [showPercentageChange, setShowPercentageChange] = useState(false);

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const {
    totalBalance: bankBalance
  } = useBankAccounts();
  const {
    totalAvailableCredit,
    creditCards
  } = useCreditCards();
  const { excludeToday } = useExcludeToday();
  const {
    data: safeSpendingData
  } = useSafeSpending(0, excludeToday);
  const {
    reserveAmount
  } = useReserveAmount();
  const {
    vendors
  } = useVendors();
  const {
    incomeItems
  } = useIncome();
  const {
    transactions
  } = useTransactions();
  const { amazonPayouts } = useAmazonPayouts();
  
  // Use unified Amazon revenue hook for consistent metrics
  const { 
    currentMonthNetPayouts: amazonRevenueThisMonth,
    allTimeNetPayouts: totalPayouts,
    payoutGrowthRate
  } = useAmazonRevenue();

  // Calculate metrics
  const today = startOfDay(new Date());
  const next30Days = addDays(today, 30);
  const next90Days = addDays(today, 90);

  // Calculate forecasted 90-day Amazon payout (total forecasted payouts)
  const forecasted90DayPayout = amazonPayouts
    .filter(payout => {
      const payoutDate = new Date(payout.payout_date);
      return (payout.status === 'forecasted' || payout.status === 'estimated') && 
             isWithinInterval(payoutDate, { start: today, end: next90Days });
    })
    .reduce((sum, payout) => sum + Number(payout.total_amount || 0), 0);

  // Total pending purchase orders (all)
  const upcomingPurchaseOrders = transactions.filter(tx => tx.type === 'purchase_order' && tx.status === 'pending').reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Total vendor payments scheduled
  const upcomingVendorPayments = vendors.filter(v => v.status !== 'paid' && Number(v.totalOwed || 0) > 0).reduce((sum, v) => sum + Number(v.totalOwed || 0), 0);

  // Total vendor count in system
  const totalVendorCount = vendors.length;

  // For UI display purposes, we still need these from amazonPayouts hook
  const confirmedPayouts = amazonPayouts.filter(p => p.status === 'confirmed') || [];
  const earliestPayoutDate = confirmedPayouts.length > 0
    ? confirmedPayouts.reduce((earliest, payout) => {
        const payoutDate = new Date(payout.payout_date);
        return payoutDate < earliest ? payoutDate : earliest;
      }, new Date(confirmedPayouts[0].payout_date))
    : null;

  // Received income (last 30 days)
  const last30DaysStart = addDays(today, -30);
  const receivedIncome = incomeItems.filter(income => 
    income.status === 'received' && 
    income.paymentDate && 
    isWithinInterval(new Date(income.paymentDate), {
      start: last30DaysStart,
      end: today
    })
  ).reduce((sum, income) => sum + Number(income.amount), 0);

  // Previous 30 days income for comparison
  const previous60DaysStart = addDays(today, -60);
  const previous30DaysIncome = incomeItems.filter(income => 
    income.status === 'received' && 
    income.paymentDate && 
    isWithinInterval(new Date(income.paymentDate), {
      start: previous60DaysStart,
      end: last30DaysStart
    })
  ).reduce((sum, income) => sum + Number(income.amount), 0);

  // Previous month Amazon revenue (for comparison, confirmed only)
  const startOfLastMonth = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const endOfLastMonth = startOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
  const previousMonthAmazonRevenue = amazonPayouts.filter(payout => {
    const payoutDate = new Date(payout.payout_date);
    return payout.status === 'confirmed' && isWithinInterval(payoutDate, { start: startOfLastMonth, end: endOfLastMonth });
  }).reduce((sum, payout) => sum + Number(payout.total_amount), 0) || 0;

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const percentageChanges = {
    safeSpending: 0, // Point-in-time value, no historical data
    max180Day: 0, // Point-in-time value, no historical data
    availableCredit: 0, // Point-in-time value, no historical data
    upcomingIncome: calculatePercentageChange(receivedIncome, previous30DaysIncome),
    purchaseOrders: 0, // Could calculate if we track creation dates
    vendorCount: 0, // Could calculate if we track vendor creation dates
    amazonRevenue: calculatePercentageChange(amazonRevenueThisMonth, previousMonthAmazonRevenue),
    totalPayouts: 0, // Cumulative value
    payoutGrowthRate: payoutGrowthRate // Already calculated as percentage
  };

  // Calculate highest projected balance within 90 days
  const calculateMaxBalance90Days = () => {
    // Create array of all cash flow events with dates
    const events: { date: Date; amount: number }[] = [];
    
    // Add income events
    incomeItems
      .filter(income => income.status !== 'received' && income.paymentDate)
      .forEach(income => {
        const date = new Date(income.paymentDate);
        if (isWithinInterval(date, { start: today, end: next90Days })) {
          events.push({ date, amount: Number(income.amount) });
        }
      });
    
    // Add Amazon forecasted payouts
    amazonPayouts
      .filter(payout => {
        const payoutDate = new Date(payout.payout_date);
        return (payout.status === 'forecasted' || payout.status === 'estimated') && 
               isWithinInterval(payoutDate, { start: today, end: next90Days });
      })
      .forEach(payout => {
        const date = new Date(payout.payout_date);
        events.push({ date, amount: Number(payout.total_amount) });
      });
    
    // Add expense events (purchase orders)
    transactions
      .filter(tx => tx.type === 'purchase_order' && tx.status === 'pending' && tx.dueDate)
      .forEach(tx => {
        const date = new Date(tx.dueDate);
        if (isWithinInterval(date, { start: today, end: next90Days })) {
          events.push({ date, amount: -Number(tx.amount) });
        }
      });
    
    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate running balance and track maximum
    let currentBalance = bankBalance;
    let maxBalance = currentBalance;
    
    events.forEach(event => {
      currentBalance += event.amount;
      if (currentBalance > maxBalance) {
        maxBalance = currentBalance;
      }
    });
    
    return maxBalance;
  };

  const max90DaySpendingPower = calculateMaxBalance90Days();

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
      // Temporarily remove gradient text effects for html2canvas compatibility
      const gradientTexts = reportRef.current.querySelectorAll('.bg-clip-text');
      const originalClasses: string[] = [];
      
      gradientTexts.forEach((el, index) => {
        originalClasses[index] = el.className;
        // Replace gradient with solid color classes
        if (el.textContent?.includes('Financial Power Report')) {
          el.className = el.className.replace('bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent', 'text-blue-600');
        } else if (el.textContent?.includes('Cash Flow Management')) {
          el.className = el.className.replace('bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent', 'text-blue-600');
        } else if (el.textContent?.includes('$')) {
          el.className = el.className.replace('bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent', 'text-emerald-600');
        } else if (el.textContent?.includes('Auren')) {
          el.className = el.className.replace('bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent', 'text-blue-600');
        }
      });

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: true,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight
      });
      
      // Restore original gradient classes
      gradientTexts.forEach((el, index) => {
        el.className = originalClasses[index];
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
        // Temporarily remove gradient text effects for html2canvas compatibility
        const gradientTexts = reportRef.current.querySelectorAll('.bg-clip-text');
        const originalClasses: string[] = [];
        
        gradientTexts.forEach((el, index) => {
          originalClasses[index] = el.className;
          // Replace gradient with solid color classes
          if (el.textContent?.includes('Financial Power Report')) {
            el.className = el.className.replace('bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent', 'text-blue-600');
          } else if (el.textContent?.includes('Cash Flow Management')) {
            el.className = el.className.replace('bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent', 'text-blue-600');
          } else if (el.textContent?.includes('$')) {
            el.className = el.className.replace('bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent', 'text-emerald-600');
          } else if (el.textContent?.includes('Auren')) {
            el.className = el.className.replace('bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent', 'text-blue-600');
          }
        });

        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(reportRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: false,
          imageTimeout: 0,
          removeContainer: true,
          windowWidth: reportRef.current.scrollWidth,
          windowHeight: reportRef.current.scrollHeight
        });
        
        // Restore original gradient classes
        gradientTexts.forEach((el, index) => {
          el.className = originalClasses[index];
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
            <Button 
              variant={showPercentageChange ? "default" : "outline"} 
              onClick={() => setShowPercentageChange(!showPercentageChange)} 
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {showPercentageChange ? "Hide" : "Show"} % Change
            </Button>
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
            <img src={aurenLogo} alt="" className="w-[600px] opacity-[0.25] select-none rotate-[-15deg] scale-110" />
            <p className="text-7xl font-black text-slate-700/30 tracking-widest -mt-16 select-none">AUREN</p>
          </div>
          
          <div className="relative z-10 p-2 md:p-4">
            {/* Header with Branding */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gradient-to-r from-blue-200 via-purple-200 to-blue-200">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-2 tracking-tight">
                  Financial Power Report
                </h1>
                <p className="text-slate-600 text-sm mb-1">Your business at a glance</p>
                <p className="text-sm font-bold text-blue-800">
                  Cash Flow Management Software For Amazon Sellers
                </p>
              </div>
              <div className="text-center flex flex-col items-center">
                <img src={aurenLogo} alt="Auren" className="h-12 md:h-14 drop-shadow-lg mb-1" />
                <p className="text-lg font-black text-blue-800 mb-1">Auren</p>
                <p className="text-xs font-semibold text-blue-800">www.aurenapp.com</p>
              </div>
            </div>

            {/* Verified Timestamp */}
            <div className="mb-4 flex items-center justify-center gap-2 text-slate-700 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100/50 rounded-lg border border-emerald-200/50">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-900">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-100/50 rounded-lg border border-blue-200/50">
                <Lock className="w-3 h-3 text-blue-700" />
                <span className="text-xs font-bold text-blue-900">Locked</span>
              </div>
            </div>

            {/* Primary Metric - Available to Spend */}
            <div className="mb-6 text-center bg-gradient-to-br from-emerald-50/15 to-green-50/15 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200/50 shadow-lg relative">
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-2 border-emerald-600 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Live Verified</span>
              </div>
              <p className="text-xs text-slate-600 mb-2 uppercase tracking-widest font-semibold">Available to Spend</p>
              <div className={`text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 drop-shadow-sm transition-all duration-300 leading-tight ${!visibility.safeSpending ? 'blur-lg' : ''}`}>
                {formatCurrency(safeSpendingData?.safe_spending_limit || 0)}
              </div>
              <p className="text-slate-600 text-xs font-medium mb-2">Safe spending power for your business</p>
              
              {/* Reserve Amount Display */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                <DollarSign className="w-3 h-3 text-blue-700" />
                <span className="text-xs font-semibold text-blue-800">Reserve: {formatCurrency(reserveAmount)}</span>
              </div>
              
              {showPercentageChange && (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg mb-2 ${percentageChanges.safeSpending >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <TrendingUp className={`w-3 h-3 ${percentageChanges.safeSpending >= 0 ? '' : 'rotate-180'}`} />
                  <span className="text-xs font-bold">{Math.abs(percentageChanges.safeSpending)}% vs last month</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/50 border border-emerald-300 rounded-lg">
                <BadgeCheck className="w-3 h-3 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Verified by Live Bank Account</span>
              </div>
              <button
                onClick={() => toggleVisibility('safeSpending')}
                className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-emerald-100/50 transition-colors z-10"
              >
                {visibility.safeSpending ? (
                  <Eye className="w-5 h-5 text-blue-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Max 90 Day Spending Power */}
              <div className="group bg-gradient-to-br from-blue-50/15 via-blue-100/15 to-blue-50/15 rounded-2xl p-4 border-2 border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-blue-50 border-2 border-blue-600 rounded-full">
                  <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Max 90 Day Spending Power</p>
                </div>
                <p className={`text-2xl font-black text-blue-700 drop-shadow-sm transition-all duration-300 ${!visibility.totalCash ? 'blur-lg' : ''}`}>{formatCurrency(max90DaySpendingPower)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.max180Day >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.max180Day >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.max180Day)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('totalCash')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
                >
                  {visibility.totalCash ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Available Credit */}
              <div className="group bg-gradient-to-br from-purple-50/15 via-purple-100/15 to-purple-50/15 rounded-2xl p-4 border-2 border-purple-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-purple-50 border-2 border-purple-600 rounded-full">
                  <div className="w-1 h-1 bg-purple-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Available Credit</p>
                </div>
                <p className={`text-2xl font-black text-purple-700 drop-shadow-sm transition-all duration-300 ${!visibility.availableCredit ? 'blur-lg' : ''}`}>{formatCurrency(totalAvailableCredit)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.availableCredit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.availableCredit >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.availableCredit)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('availableCredit')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-purple-100/50 transition-colors z-10"
                >
                  {visibility.availableCredit ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Upcoming Income */}
              <div className="group bg-gradient-to-br from-emerald-50/15 via-emerald-100/15 to-emerald-50/15 rounded-2xl p-4 border-2 border-emerald-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border-2 border-emerald-600 rounded-full">
                  <div className="w-1 h-1 bg-emerald-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Received Income (30d)</p>
            </div>
            <p className={`text-2xl font-black text-emerald-700 drop-shadow-sm transition-all duration-300 ${!visibility.upcomingIncome ? 'blur-lg' : ''}`}>{formatCurrency(receivedIncome)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.upcomingIncome >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.upcomingIncome >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.upcomingIncome)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('upcomingIncome')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-emerald-100/50 transition-colors z-10"
                >
                  {visibility.upcomingIncome ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Purchase Orders */}
              <div className="group bg-gradient-to-br from-orange-50/15 via-orange-100/15 to-orange-50/15 rounded-2xl p-4 border-2 border-orange-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-orange-50 border-2 border-orange-600 rounded-full">
                  <div className="w-1 h-1 bg-orange-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Purchase Orders</p>
                </div>
                <p className={`text-2xl font-black text-orange-700 drop-shadow-sm transition-all duration-300 ${!visibility.purchaseOrders ? 'blur-lg' : ''}`}>{formatCurrency(upcomingPurchaseOrders)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.purchaseOrders >= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.purchaseOrders >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.purchaseOrders)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('purchaseOrders')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-orange-100/50 transition-colors z-10"
                >
                  {visibility.purchaseOrders ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Active Vendors */}
              <div className="group bg-gradient-to-br from-indigo-50/15 via-indigo-100/15 to-indigo-50/15 rounded-2xl p-4 border-2 border-indigo-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border-2 border-indigo-600 rounded-full">
                  <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Total Vendors</p>
                </div>
                <p className={`text-2xl font-black text-indigo-700 drop-shadow-sm transition-all duration-300 ${!visibility.vendorCount ? 'blur-lg' : ''}`}>{totalVendorCount}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.vendorCount >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.vendorCount >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.vendorCount)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('vendorCount')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-indigo-100/50 transition-colors z-10"
                >
                  {visibility.vendorCount ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Amazon Revenue (30d) */}
              <div className="group bg-gradient-to-br from-violet-50/15 via-purple-100/15 to-violet-50/15 rounded-2xl p-4 border-2 border-purple-300/60 shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-sm relative ring-2 ring-purple-200/30">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-purple-50 border-2 border-purple-600 rounded-full">
                  <div className="w-1 h-1 bg-purple-600 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-purple-500 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Forecasted 90 Day Payout</p>
                    <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider">Core Feature</span>
                  </div>
                </div>
                <p className={`text-2xl font-black text-purple-700 drop-shadow-sm transition-all duration-300 ${!visibility.amazonRevenue ? 'blur-lg' : ''}`}>{formatCurrency(forecasted90DayPayout)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.amazonRevenue >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.amazonRevenue >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.amazonRevenue).toFixed(1)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('amazonRevenue')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-purple-100/50 transition-colors z-10"
                >
                  {visibility.amazonRevenue ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Total Amazon Payouts */}
              <div className="group bg-gradient-to-br from-orange-50/15 via-orange-100/15 to-orange-50/15 rounded-2xl p-4 border-2 border-orange-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-orange-50 border-2 border-orange-600 rounded-full">
                  <div className="w-1 h-1 bg-orange-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Total Amazon Payouts</p>
                </div>
                <p className={`text-2xl font-black text-orange-700 drop-shadow-sm transition-all duration-300 ${!visibility.totalPayouts ? 'blur-lg' : ''}`}>{formatCurrency(totalPayouts)}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {confirmedPayouts.length} payouts tracked
                  {earliestPayoutDate && ` • Starting ${earliestPayoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </p>
                {showPercentageChange && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 bg-blue-100 text-blue-700">
                    <span className="text-[10px] font-bold">All-Time</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('totalPayouts')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-orange-100/50 transition-colors z-10"
                >
                  {visibility.totalPayouts ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Payout Growth Rate */}
              <div className="group bg-gradient-to-br from-green-50/15 via-green-100/15 to-green-50/15 rounded-2xl p-4 border-2 border-green-200/60 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-green-50 border-2 border-green-600 rounded-full">
                  <div className="w-1 h-1 bg-green-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Payout Growth Rate (1y)</p>
                </div>
                <p className={`text-2xl font-black ${payoutGrowthRate >= 0 ? 'text-green-700' : 'text-red-700'} drop-shadow-sm transition-all duration-300 ${!visibility.payoutGrowthRate ? 'blur-lg' : ''}`}>
                  {payoutGrowthRate >= 0 ? '+' : ''}{payoutGrowthRate.toFixed(1)}%
                </p>
                {showPercentageChange && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 bg-blue-100 text-blue-700">
                    <span className="text-[10px] font-bold">vs. Previous 6m</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('payoutGrowthRate')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-green-100/50 transition-colors z-10"
                >
                  {visibility.payoutGrowthRate ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t-2 border-gradient-to-r from-slate-200 via-slate-300 to-slate-200">
              <div className="flex items-center justify-center text-xs mb-3">
                <div className="text-center">
                  <p className="text-slate-700 font-semibold text-sm mb-1">
                    Powered by <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent font-black text-base">Auren</span>
                  </p>
                  <p className="text-xs font-bold text-slate-700">Cash Flow Management Software For Amazon Sellers</p>
                  <p className="text-xs font-semibold text-blue-600 mt-1">www.aurenapp.com</p>
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