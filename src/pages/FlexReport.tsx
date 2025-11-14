import React, { useRef, useState, useEffect } from "react";
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
import aurenLogo from "@/assets/auren-icon-blue.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

const FlexReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Force light mode when component mounts, restore on unmount
  useEffect(() => {
    const previousTheme = theme;
    setTheme('light');
    
    return () => {
      if (previousTheme) {
        setTheme(previousTheme);
      }
    };
  }, []);

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
          el.className = el.className.replace('bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 bg-clip-text text-transparent', 'text-blue-600');
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
            el.className = el.className.replace('bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 bg-clip-text text-transparent', 'text-blue-600');
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
  return <div className="h-screen overflow-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-2 md:p-4 relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a15_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />
      
      <div className="max-w-3xl mx-auto scale-[0.85] origin-top relative z-10">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-4">
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
        <Card ref={reportRef} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 shadow-2xl border border-blue-500/20 backdrop-blur-xl">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 to-indigo-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Tech grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:2rem_2rem]" />
          
          {/* Auren Watermark with glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <img src={aurenLogo} alt="" className="w-[600px] opacity-[0.08] select-none rotate-[-15deg] scale-110 drop-shadow-[0_0_80px_rgba(59,130,246,0.3)]" />
          </div>
          
          <div className="relative z-10 p-3 md:p-4">
            {/* Header with Branding */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-blue-500/30 relative">
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2 tracking-tight drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  Financial Power Report
                </h1>
                <p className="text-blue-300/80 text-sm mb-1">Your business at a glance</p>
                <p className="text-sm font-bold text-cyan-400">
                  Cash Flow Management Software For Amazon Sellers
                </p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 blur-xl bg-blue-500/50 rounded-full" />
                  <img src={aurenLogo} alt="Auren" className="h-12 md:h-14 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)] mb-1 relative" />
                </div>
                <p className="text-lg font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1">Auren</p>
                <p className="text-xs font-semibold text-blue-400">www.aurenapp.com</p>
              </div>
            </div>

            {/* Verified Timestamp */}
            <div className="mb-4 flex items-center justify-center gap-2 bg-slate-800/50 backdrop-blur-md rounded-xl p-3 border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-950/50 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="font-mono text-xs font-bold text-cyan-300">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/50 rounded-lg border border-blue-500/30 backdrop-blur-sm">
                <Lock className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-bold text-blue-300">Locked</span>
              </div>
            </div>

            {/* Primary Metric - Available to Spend */}
            <div className="mb-4 text-center bg-gradient-to-br from-slate-800/80 to-blue-900/80 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/40 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
              {/* Animated glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 animate-pulse" />
              
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/50 rounded-full backdrop-blur-sm">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Live Verified</span>
              </div>
              <p className="text-xs text-blue-300/80 mb-2 uppercase tracking-widest font-semibold relative">Available to Spend</p>
              <div className={`text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent mb-3 transition-all duration-300 leading-tight drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] relative ${!visibility.safeSpending ? 'blur-lg' : ''}`}>
                {formatCurrency(safeSpendingData?.safe_spending_limit || 0)}
              </div>
              <p className="text-blue-300/70 text-xs font-medium mb-2 relative">Safe spending power for your business</p>
              
              {/* Reserve Amount Display */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-950/50 border border-blue-500/30 rounded-lg mb-3 backdrop-blur-sm relative">
                <DollarSign className="w-3 h-3 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">Reserve: {formatCurrency(reserveAmount)}</span>
              </div>
              
              {showPercentageChange && (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg mb-2 ${percentageChanges.safeSpending >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <TrendingUp className={`w-3 h-3 ${percentageChanges.safeSpending >= 0 ? '' : 'rotate-180'}`} />
                  <span className="text-xs font-bold">{Math.abs(percentageChanges.safeSpending)}% vs last month</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/50 border border-cyan-500/40 rounded-lg backdrop-blur-sm relative">
                <BadgeCheck className="w-3 h-3 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">Verified by Live Bank Account</span>
              </div>
              <button
                onClick={() => toggleVisibility('safeSpending')}
                className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
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
              <div className="group bg-gradient-to-br from-slate-800/70 to-blue-900/70 rounded-2xl p-4 border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:shadow-xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full backdrop-blur-sm">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Max 90 Day Spending Power</p>
                </div>
                <p className={`text-2xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 relative ${!visibility.totalCash ? 'blur-lg' : ''}`}>{formatCurrency(max90DaySpendingPower)}</p>
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
              <div className="group bg-gradient-to-br from-slate-800/70 to-blue-900/70 rounded-2xl p-4 border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:shadow-xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full backdrop-blur-sm">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Available Credit</p>
                </div>
                <p className={`text-2xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 relative ${!visibility.availableCredit ? 'blur-lg' : ''}`}>{formatCurrency(totalAvailableCredit)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.availableCredit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.availableCredit >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.availableCredit)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('availableCredit')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
                >
                  {visibility.availableCredit ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>


              {/* Purchase Orders */}
              <div className="group bg-gradient-to-br from-slate-800/70 to-blue-900/70 rounded-2xl p-4 border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:shadow-xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full backdrop-blur-sm">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Purchase Orders</p>
                </div>
                <p className={`text-2xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 relative ${!visibility.purchaseOrders ? 'blur-lg' : ''}`}>{formatCurrency(upcomingPurchaseOrders)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.purchaseOrders >= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.purchaseOrders >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.purchaseOrders)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('purchaseOrders')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
                >
                  {visibility.purchaseOrders ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>


              {/* Amazon Revenue (30d) */}
              <div className="group bg-gradient-to-br from-slate-800/70 to-blue-900/70 rounded-2xl p-4 border border-cyan-500/40 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:shadow-2xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden ring-1 ring-cyan-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-cyan-500/30 border border-cyan-400/50 rounded-full backdrop-blur-sm">
                  <div className="w-1 h-1 bg-cyan-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]"></div>
                  <span className="text-[10px] font-black text-cyan-200 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/30 rounded-xl blur-md animate-pulse" />
                    <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/40 group-hover:scale-110 group-hover:shadow-cyan-500/60 transition-all duration-300 relative">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Forecasted 90 Day Payout</p>
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Core Feature</span>
                  </div>
                </div>
                <p className={`text-2xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all duration-300 relative ${!visibility.amazonRevenue ? 'blur-lg' : ''}`}>{formatCurrency(forecasted90DayPayout)}</p>
                {showPercentageChange && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 ${percentageChanges.amazonRevenue >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${percentageChanges.amazonRevenue >= 0 ? '' : 'rotate-180'}`} />
                    <span className="text-[10px] font-bold">{Math.abs(percentageChanges.amazonRevenue).toFixed(1)}%</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('amazonRevenue')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
                >
                  {visibility.amazonRevenue ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Total Amazon Payouts */}
              <div className="group bg-gradient-to-br from-slate-800/70 to-blue-900/70 rounded-2xl p-4 border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:shadow-xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full backdrop-blur-sm">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Total Amazon Payouts</p>
                </div>
                <p className={`text-2xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 relative ${!visibility.totalPayouts ? 'blur-lg' : ''}`}>{formatCurrency(totalPayouts)}</p>
                <p className="text-xs text-blue-400/70 mt-1 relative">
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
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
                >
                  {visibility.totalPayouts ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Payout Growth Rate */}
              <div className="group bg-gradient-to-br from-slate-800/70 to-blue-900/70 rounded-2xl p-4 border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:shadow-xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full backdrop-blur-sm">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Payout Growth Rate (1y)</p>
                </div>
                <p className={`text-2xl font-black ${payoutGrowthRate >= 0 ? 'bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-gradient-to-r from-red-400 to-orange-400'} bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 relative ${!visibility.payoutGrowthRate ? 'blur-lg' : ''}`}>
                  {payoutGrowthRate >= 0 ? '+' : ''}{payoutGrowthRate.toFixed(1)}%
                </p>
                {showPercentageChange && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 bg-blue-100 text-blue-700">
                    <span className="text-[10px] font-bold">vs. Previous 6m</span>
                  </div>
                )}
                <button
                  onClick={() => toggleVisibility('payoutGrowthRate')}
                  className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-blue-100/50 transition-colors z-10"
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
            <div className="pt-4 border-t border-blue-500/30 relative">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              <div className="flex items-center justify-center text-xs mb-3">
                <div className="text-center">
                  <p className="text-blue-300 font-semibold text-sm mb-1">
                    Powered by <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent font-black text-base drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">Auren</span>
                  </p>
                  <p className="text-xs font-bold text-blue-400">Cash Flow Management Software For Amazon Sellers</p>
                  <p className="text-xs font-semibold text-cyan-400 mt-1">www.aurenapp.com</p>
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