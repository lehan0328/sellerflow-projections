import React, { useState, useMemo, useEffect } from "react";
import { addDays, isToday, isBefore, startOfDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Building2, CreditCard as CreditCardIcon, TrendingUp, TrendingDown, Calendar, CheckCircle, User, Database, Trash2, AlertTriangle, Shield, Users, ShoppingCart, Palette, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { CashFlowInsights } from "@/components/cash-flow/cash-flow-insights";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards, getCreditCardDueDates } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { IncomeForm } from "@/components/cash-flow/income-form";
import { RecurringExpensesOverview } from "@/components/cash-flow/recurring-expenses-overview";
import { ReferralDashboardContent } from "@/components/ReferralDashboardContent";
import { TransactionsView } from "@/components/TransactionsView";
import { useIncome } from "@/hooks/useIncome";
import { useExcludeToday } from "@/contexts/ExcludeTodayContext";
import ScenarioPlanner from "@/pages/ScenarioPlanner";
import Analytics from "@/pages/Analytics";
import AmazonForecast from "@/pages/AmazonForecast";
import DocumentStorage from "@/pages/DocumentStorage";
import Support from "@/pages/Support";
import Notifications from "@/pages/Notifications";
import MatchTransactions from "@/pages/MatchTransactions";
import { TeamManagement } from "@/components/settings/team-management";
import { SidebarNavigation } from "@/components/settings/sidebar-navigation";
import { CreditCardManagement } from "@/components/settings/credit-card-management";
import { VendorManagement } from "@/components/settings/vendor-management";
import { AmazonManagement } from "@/components/settings/amazon-management";
import { BankAccountManagement } from "@/components/settings/bank-account-management";
import { CustomerManagement } from "@/components/settings/customer-management";
import { RecurringExpenseManagement } from "@/components/settings/recurring-expense-management";
import { DataExport } from "@/components/settings/data-export";
import { CategoryManagement } from "@/components/settings/category-management";
import { BillingInvoices } from "@/components/settings/billing-invoices";
import { ForecastSettings } from "@/components/settings/forecast-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useReserveAmount } from "@/hooks/useReserveAmount";
import { useCustomers } from "@/hooks/useCustomers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreditCards } from "@/hooks/useCreditCards";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { LimitEnforcementModal } from "@/components/LimitEnforcementModal";

import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { useSafeSpending } from "@/hooks/useSafeSpending";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { generateRecurringDates } from "@/lib/recurringDates";
import { BankTransaction } from "@/components/cash-flow/bank-transaction-log";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";
import { TransactionMatchNotification } from "@/components/cash-flow/transaction-match-notification";
import { TransactionMatchButton } from "@/components/cash-flow/transaction-match-button";
import { MatchReviewDialog } from "@/components/cash-flow/match-review-dialog";
import { TransactionMatch } from "@/hooks/useTransactionMatching";
import { ManualMatchDialog } from "@/components/cash-flow/manual-match-dialog";

// ========== Type Definitions ==========

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  creditCardId?: string | null;
  source?: string;
  date: Date;
  // Whether this event should affect cash balance calculations
  affectsBalance?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [settingsSection, setSettingsSection] = useState("profile");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [clearDataConfirmation, setClearDataConfirmation] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { first_name?: string; last_name?: string; company?: string; currency?: string }) => {
      if (!user?.id) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Check if user is website admin
  const { data: isWebsiteAdmin = false } = useQuery({
    queryKey: ['is-website-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_website_admin');
      if (error) {
        console.error('Error checking website admin status:', error);
        return false;
      }
      return data || false;
    },
    enabled: !!user?.id,
  });

  // Set currency and company from profile data
  useEffect(() => {
    if (profile?.currency) {
      setSelectedCurrency(profile.currency);
    }
    if (profile?.company) {
      setCompanyName(profile.company);
    }
  }, [profile]);

  // Handle profile field changes
  const handleProfileChange = (field: string, value: string) => {
    updateProfileMutation.mutate({ [field]: value });
  };

  const handleClearAllData = async () => {
    console.log('🗑️ Dashboard - calling resetAccount');
    await resetAccount();
  };

  const handleRestoreAdminAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('restore-admin-access');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Success",
          description: "Admin access restored successfully! Refreshing...",
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data?.error || "Failed to restore admin access");
      }
    } catch (error) {
      console.error("Error restoring admin access:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore admin access",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAdminTestData = async () => {
    try {
      toast({
        title: "Generating test data...",
        description: "This may take a moment",
      });
      const { data, error } = await supabase.functions.invoke('generate-admin-test-data');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Success",
          description: `Created ${data.data.users_created} users, ${data.data.support_tickets} tickets, ${data.data.referral_codes} referral codes`,
        });
      } else {
        throw new Error(data?.error || "Failed to generate test data");
      }
    } catch (error) {
      console.error("Error generating test data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate test data",
        variant: "destructive",
      });
    }
  };

  const getThemeIcon = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };
  
  // Handle section change with special logic for team-management
  const handleSectionChange = (section: string) => {
    if (section === "team-management") {
      setActiveSection("settings");
      setSettingsSection("team");
    } else {
      setActiveSection(section);
      if (section !== "settings") {
        setSettingsSection("profile"); // Reset to default when leaving settings
      }
    }
  };
  const [financialsView, setFinancialsView] = useState<"bank-accounts" | "credit-cards" | "amazon-payouts">("bank-accounts");
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [showEditIncomeForm, setShowEditIncomeForm] = useState(false);
  const { toast } = useToast();
  const [vendorTxRefresh, setVendorTxRefresh] = useState(0);
  const [matchReviewDialog, setMatchReviewDialog] = useState<{
    open: boolean;
    match: TransactionMatch | null;
  }>({ open: false, match: null });
  const [matchingAll, setMatchingAll] = useState(false);
  const [syncingTransactions, setSyncingTransactions] = useState(false);
  const [isBankSyncing, setIsBankSyncing] = useState(false);
  const [manualMatchDialog, setManualMatchDialog] = useState<{
    open: boolean;
    transaction: BankTransaction | null;
  }>({ open: false, transaction: null });
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("all");
  const [useAvailableBalance, setUseAvailableBalance] = useState(() => {
    const saved = localStorage.getItem('useAvailableBalance');
    return saved !== null ? saved === 'true' : true; // Default to true (available balance)
  });
  
  // Use database hooks
  const { vendors, addVendor, updateVendor, deleteVendor, deleteAllVendors, cleanupOrphanedVendors, refetch: refetchVendors } = useVendors();
  const { transactions, addTransaction, deleteTransaction, refetch: refetchTransactions } = useTransactions();
  const { transactions: vendorTransactions, markAsPaid, refetch: refetchVendorTransactions } = useVendorTransactions();
  const { totalBalance: bankAccountBalance, accounts, refetch: refetchBankAccounts } = useBankAccounts();
  
  // Calculate available balance total
  const totalAvailableBalance = accounts.reduce((sum, account) => {
    return sum + (account.available_balance ?? account.balance);
  }, 0);
  
  // Use selected balance type
  const displayBankBalance = useAvailableBalance ? totalAvailableBalance : bankAccountBalance;
  
  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('useAvailableBalance', String(useAvailableBalance));
  }, [useAvailableBalance]);
  const { transactions: bankTransactionsData, isLoading: isBankTransactionsLoading, refetch: refetchBankTransactions } = useBankTransactions();
  const { creditCards, refetch: refetchCreditCards } = useCreditCards();
  const { recurringExpenses, createRecurringExpense } = useRecurringExpenses();
  const { reserveAmount, updateReserveAmount, canUpdate: canUpdateReserve, lastUpdated: lastReserveUpdate } = useReserveAmount();
  const { excludeToday } = useExcludeToday();
  const { data: safeSpendingData, refetch: refetchSafeSpending } = useSafeSpending(reserveAmount, excludeToday, useAvailableBalance);
  const { isOverBankLimit, isOverAmazonLimit, isOverTeamLimit, currentUsage, planLimits } = usePlanLimits();
  const [showLimitModal, setShowLimitModal] = useState<{
    open: boolean;
    type: 'bank_connection' | 'amazon_connection' | 'user';
  }>({ open: false, type: 'bank_connection' });

  // Refetch safe spending whenever reserve amount changes
  useEffect(() => {
    console.log('💰 [DASHBOARD] Reserve amount changed to:', reserveAmount, '- refetching safe spending');
    refetchSafeSpending();
  }, [reserveAmount, refetchSafeSpending]);
  
  // Refetch safe spending whenever exclude today changes
  useEffect(() => {
    console.log('🔄 [DASHBOARD] Exclude today changed to:', excludeToday, '- refetching safe spending');
    refetchSafeSpending();
  }, [excludeToday, refetchSafeSpending]);
  
  // Refetch safe spending whenever balance toggle changes
  useEffect(() => {
    console.log('💳 [DASHBOARD] Balance type changed to:', useAvailableBalance ? 'Available' : 'Current', '- Current balance:', bankAccountBalance, 'Available balance:', totalAvailableBalance, '- TRIGGERING REFETCH');
    refetchSafeSpending();
  }, [useAvailableBalance, refetchSafeSpending, bankAccountBalance, totalAvailableBalance]);
  
  // Refetch safe spending whenever bank accounts change (added, removed, or balance updated)
  useEffect(() => {
    console.log('🏦 [DASHBOARD] Bank accounts changed (count:', accounts.length, ') - refetching safe spending');
    refetchSafeSpending();
  }, [accounts.length, displayBankBalance, refetchSafeSpending]);
  
  // Check for limit violations and show modal
  useEffect(() => {
    if (isOverBankLimit) {
      setShowLimitModal({ open: true, type: 'bank_connection' });
    } else if (isOverAmazonLimit) {
      setShowLimitModal({ open: true, type: 'amazon_connection' });
    } else if (isOverTeamLimit) {
      setShowLimitModal({ open: true, type: 'user' });
    } else {
      // Close modal when all limits are satisfied
      setShowLimitModal({ open: false, type: 'bank_connection' });
    }
  }, [isOverBankLimit, isOverAmazonLimit, isOverTeamLimit]);
  
  const { amazonPayouts } = useAmazonPayouts();
  
  console.log('Dashboard - bankAccountBalance:', bankAccountBalance, 'accounts connected:', accounts?.length || 0);
  const { totalCash: userSettingsCash, updateTotalCash, setStartingBalance, resetAccount } = useUserSettings();

  // Real-time updates for bank account balance changes
  useEffect(() => {
    const channel = supabase
      .channel('bank-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bank_accounts'
        },
        (payload) => {
          console.log('Bank account updated:', payload);
          refetchBankAccounts();
          refetchSafeSpending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchBankAccounts, refetchSafeSpending]);

  // Combine bank accounts and credit cards into one list for the dropdown
  const allFinancialAccounts = useMemo(() => {
    const combined: Array<{ 
      id: string; 
      type: 'bank' | 'credit'; 
      institution_name: string; 
      account_name: string;
      last_sync: string;
    }> = [];
    
    // Add bank accounts
    accounts.forEach(acc => {
      combined.push({
        id: acc.id,
        type: 'bank',
        institution_name: acc.institution_name,
        account_name: acc.account_name,
        last_sync: acc.last_sync,
      });
    });
    
    // Add credit cards
    creditCards.forEach(card => {
      combined.push({
        id: card.id,
        type: 'credit',
        institution_name: card.institution_name,
        account_name: card.account_name,
        last_sync: card.last_sync,
      });
    });
    
    return combined;
  }, [accounts, creditCards]);

  // Map real bank transactions to BankTransaction format
  const allBankTransactions: BankTransaction[] = useMemo(() => {
    if (!bankTransactionsData) return [];
    
    return bankTransactionsData.map(tx => {
      // Check both bank accounts and credit cards
      const account = accounts?.find(acc => acc.id === tx.bankAccountId);
      const creditCard = creditCards?.find(card => card.id === tx.creditCardId);
      
      // Flip: Negative amount = credit, Positive = debit
      const txType = tx.amount < 0 ? 'credit' : 'debit';
      const txAmount = Math.abs(tx.amount);
      
      return {
        id: tx.id,
        accountId: tx.bankAccountId || tx.creditCardId,
        accountName: account?.account_name || creditCard?.account_name || 'Unknown Account',
        institutionName: account?.institution_name || creditCard?.institution_name || 'Unknown',
        date: tx.date,
        description: tx.name,
        merchantName: tx.merchantName,
        amount: txAmount,
        type: txType,
        category: tx.category?.[0] || 'Uncategorized',
        status: tx.pending ? 'pending' : 'posted',
        matchScore: 0
      } as BankTransaction;
    });
  }, [bankTransactionsData, accounts, creditCards]);

  // Filter bank transactions by selected account
  const bankTransactions = useMemo(() => {
    if (selectedBankAccountId === "all") return allBankTransactions;
    return allBankTransactions.filter(tx => tx.accountId === selectedBankAccountId);
  }, [allBankTransactions, selectedBankAccountId]);

  // Group transactions by bank account
  const transactionsByAccount = useMemo(() => {
    const grouped = new Map<string, BankTransaction[]>();
    bankTransactions.forEach(tx => {
      const key = `${tx.institutionName} - ${tx.accountName}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(tx);
    });
    return Array.from(grouped.entries()).map(([accountName, txs]) => ({
      accountName,
      transactions: txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }));
  }, [bankTransactions]);
  
  // Ensure starting balance is 0 for a fresh start (so 9/29 shows only the $60k inflow)
  React.useEffect(() => {
    const fixed = localStorage.getItem('balance_start_0');
    if (!fixed && userSettingsCash !== 0) {
      setStartingBalance(0);
      localStorage.setItem('balance_start_0', 'true');
    }
  }, [userSettingsCash, setStartingBalance]);

  // Cleanup orphaned vendors on mount
  React.useEffect(() => {
    const cleaned = localStorage.getItem('vendors_cleaned');
    if (!cleaned) {
      cleanupOrphanedVendors?.();
      localStorage.setItem('vendors_cleaned', 'true');
    }
  }, [cleanupOrphanedVendors]);

  // Cleanup orphaned transactions on mount (one-time)
  React.useEffect(() => {
    const cleanupOrphanedTransactions = async () => {
      const cleaned = localStorage.getItem('transactions_cleaned_v2');
      if (!cleaned) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data } = await supabase.functions.invoke('cleanup-orphaned-transactions', {
              headers: { Authorization: `Bearer ${session.access_token}` }
            });
            console.log('🧹 Orphaned transactions cleanup:', data);
            localStorage.setItem('transactions_cleaned_v2', 'true');
            // Refresh calculations after cleanup
            setTimeout(() => {
              refetchSafeSpending();
            }, 1000);
          }
        } catch (error) {
          console.error('Error cleaning up orphaned transactions:', error);
        }
      }
    };
    cleanupOrphanedTransactions();
  }, [refetchSafeSpending]);


  const { customers, addCustomer } = useCustomers();
  
  // State for vendors used in forms (derived from database vendors) - always fresh data
  const formVendors = useMemo(() => {
    console.log('Dashboard - Creating formVendors from vendors:', vendors);
    
    // Filter to only include management vendors (matching Vendor Management page)
    // and get unique vendors by name and sort alphabetically
    const uniqueVendors = vendors
      .filter(vendor => vendor.source === 'management')
      .filter((vendor, index, self) => 
        index === self.findIndex(v => v.name.toLowerCase() === vendor.name.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(v => ({ 
        id: v.id, 
        name: v.name, 
        paymentType: v.paymentType || 'total',
        paymentMethod: v.paymentMethod || 'bank-transfer',
        netTermsDays: (v.netTermsDays ?? '30') as any,
        category: v.category || "",
        source: v.source || 'management'
      }));
    
    console.log('Dashboard - formVendors result (unique):', uniqueVendors);
    return uniqueVendors;
  }, [vendors]); // Recompute when vendors change
  
  // Force refresh vendors when opening Purchase Order form to ensure fresh data
  const handleOpenPurchaseOrderForm = () => {
    refetchVendors(); // Ensure we have the latest vendor data
    setShowPurchaseOrderForm(true);
  };

  const [cashFlowEvents, setCashFlowEvents] = useState<CashFlowEvent[]>([]);
  
  // Sample income data - replaced with database hook
  const { incomeItems, addIncome, updateIncome, deleteIncome, refetch: refetchIncome } = useIncome();

  // Transaction matching for bank transactions
  const { matches, getMatchesForIncome } = useTransactionMatching(
    bankTransactions, 
    vendorTransactions || [],
    incomeItems.filter(item => item.status !== 'received')
  );
  
  // Calculate unique PO/vendor transactions with matches (not total match count)
  const uniquePoMatchCount = matches.reduce((acc, match) => {
    let txId: string;
    if (match.type === 'vendor' && match.matchedVendorTransaction) {
      txId = match.matchedVendorTransaction.id;
    } else if (match.type === 'income' && match.matchedIncome) {
      txId = match.matchedIncome.id;
    } else {
      return acc;
    }
    acc.add(txId);
    return acc;
  }, new Set<string>()).size;
  
  // Keep this for the notification component
  const unmatchedTransactionsCount = matches.length;

  // Calculate pending income due today that's not matched
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  const pendingIncomeToday = incomeItems
    .filter(income => {
      const paymentDate = new Date(income.paymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      const isDueOrOverdue = paymentDate.getTime() <= todayDate.getTime();
      const isPending = income.status === 'pending';
      const isNotMatched = getMatchesForIncome(income.id).length === 0;
      return isDueOrOverdue && isPending && isNotMatched;
    })
    .reduce((acc, income) => ({
      amount: acc.amount + income.amount,
      count: acc.count + 1
    }), { amount: 0, count: 0 });

  // No sample data for new users

  // No sample data for new users

  // State for vendor editing modal
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // ========== Event Handlers ==========

  const handleBankSync = async () => {
    if (selectedBankAccountId === 'all') {
      toast({
        title: "Select Account",
        description: "Please select a specific account to sync",
        variant: "destructive"
      });
      return;
    }

    // Determine if the selected account is a bank account or credit card
    const selectedAccount = allFinancialAccounts.find(acc => acc.id === selectedBankAccountId);
    const accountType = selectedAccount?.type === 'credit' ? 'credit' : 'bank';

    setIsBankSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-plaid-transactions', {
        body: { 
          accountId: selectedBankAccountId,
          accountType: accountType,
          isInitialSync: false
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: "Bank transactions are being synced. This may take a moment.",
      });

      // Refresh bank transactions after a short delay
      setTimeout(() => {
        refetchBankTransactions();
        setIsBankSyncing(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error syncing bank transactions:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync bank transactions",
        variant: "destructive"
      });
      setIsBankSyncing(false);
    }
  };

  const handlePayToday = async (vendor: Vendor, amount?: number) => {
    const paymentAmount = amount || vendor.nextPaymentAmount;
    
    console.info("Processing payment:", paymentAmount, "Bank balance:", bankAccountBalance);
    
    // Note: In a real Plaid integration, this would trigger an actual bank transaction
    // For now, we just update the vendor status

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
      type: 'outflow',
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

    // Note: In a real Plaid integration, this would reverse the bank transaction
    
    // If this was a vendor payment, restore vendor balance
    if (transaction.type === 'vendor_payment' && transaction.vendorId) {
      const vendor = vendors.find(v => v.id === transaction.vendorId);
      if (vendor) {
        await updateVendor(transaction.vendorId, {
          totalOwed: vendor.totalOwed + transaction.amount
        });
      }
    }

    // Remove transaction from database
    await deleteTransaction(transactionId);
    
    // Refresh vendors to show updated data
    refetchVendors();
    
    // Remove corresponding cash flow event from calendar
    setCashFlowEvents(prev => prev.filter(e => 
      !(e.description === transaction.description && 
        e.amount === transaction.amount &&
        Math.abs(e.date.getTime() - transaction.transactionDate.getTime()) < 86400000) // Within 24 hours
    ));
  };

  const handlePurchaseOrderSubmit = async (orderData: any) => {
    console.info("Purchase order received in Dashboard:", orderData);
    console.info("🔍 Debug PO - dueDate:", orderData.dueDate, "paymentType:", orderData.paymentType);
    
    const amount = typeof orderData.amount === 'string' ? 
      parseFloat(orderData.amount) : orderData.amount;
    
    const dueDate = orderData.dueDate || new Date();
    const today = startOfDay(new Date());
    const dueDateStartOfDay = startOfDay(dueDate);
    
    console.info("🔍 Debug PO - calculated status:", {
      dueDate: dueDate.toISOString(),
      today: today.toISOString(), 
      dueDateStartOfDay: dueDateStartOfDay.toISOString(),
      willBePending: dueDateStartOfDay > today
    });
    
    // Check if vendor already exists (selected from dropdown)
    let vendorId = orderData.vendorId;
    
    if (!vendorId) {
      // Create new vendor profile if it doesn't exist
      console.info("Creating new vendor profile");
      
      // Map form payment types to database payment types
      let dbPaymentType: 'total' | 'preorder' | 'net-terms' = 'total';
      switch (orderData.paymentType) {
        case 'net-terms':
          dbPaymentType = 'net-terms';
          break;
        case 'preorder':
          dbPaymentType = 'preorder';
          break;
        case 'due-upon-order':
        case 'due-upon-delivery':
        default:
          dbPaymentType = 'total';
          break;
      }

      const newVendor = await addVendor({
        name: orderData.vendor,
        totalOwed: 0, // Don't store aggregate data here
        nextPaymentDate: new Date(),
        nextPaymentAmount: 0,
        status: 'upcoming',
        category: orderData.category || '',
        paymentType: dbPaymentType,
        netTermsDays: orderData.netTermsDays,
        source: 'management',
        poName: '',
        description: '',
        notes: ''
      });
      
      vendorId = newVendor?.id;
    }

    // If payment method is credit card, deduct from that card's available credit
    if (orderData.paymentMethod === 'credit-card' && orderData.selectedCreditCard) {
      const selectedCard = creditCards.find(card => card.id === orderData.selectedCreditCard);
      if (selectedCard) {
        const newBalance = selectedCard.balance + amount;
        const newAvailableCredit = selectedCard.available_credit - amount;
        
        await supabase
          .from('credit_cards')
          .update({
            balance: newBalance,
            available_credit: newAvailableCredit,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderData.selectedCreditCard);
        
        console.info(`Credit card ${selectedCard.account_name} charged: $${amount}`);
      }
    }

    // Handle preorder payment schedule - create multiple transactions
    if (orderData.paymentType === 'preorder' && orderData.paymentSchedule && orderData.paymentSchedule.length > 0) {
      console.info("Creating preorder transactions with payment schedule:", orderData.paymentSchedule);
      
      // Create a transaction for each payment in the schedule
      for (let i = 0; i < orderData.paymentSchedule.length; i++) {
        const payment = orderData.paymentSchedule[i];
        const paymentAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
        const paymentDueDate = payment.dueDate || new Date();
        const paymentDueDateStartOfDay = startOfDay(paymentDueDate);
        
        const transactionData = {
          type: 'purchase_order' as const,
          amount: paymentAmount,
          description: `${orderData.poName || `PO - ${orderData.vendor}`} - ${payment.description || `Payment ${i + 1}`}`,
          vendorId: vendorId,
          transactionDate: orderData.poDate || new Date(),
          dueDate: paymentDueDate,
          status: (paymentDueDateStartOfDay <= today ? 'completed' : 'pending') as 'completed' | 'pending',
          creditCardId: orderData.paymentMethod === 'credit-card' ? orderData.selectedCreditCard : null
        };
        
        console.info(`🔍 Creating preorder transaction ${i + 1}/${orderData.paymentSchedule.length}:`, transactionData);
        await addTransaction(transactionData);
      }
    } else {
      // Create single transaction for non-preorder POs
      const transactionData = {
        type: 'purchase_order' as const,
        amount: amount,
        description: orderData.poName || `PO - ${orderData.vendor}`,
        vendorId: vendorId,
        transactionDate: orderData.poDate || new Date(),
        dueDate: dueDate,
        status: (dueDateStartOfDay <= today ? 'completed' : 'pending') as 'completed' | 'pending',
        creditCardId: orderData.paymentMethod === 'credit-card' ? orderData.selectedCreditCard : null
      };
      
      console.info("🔍 Creating transaction:", transactionData);
      const newTransaction = await addTransaction(transactionData);
      console.info("🔍 Transaction created:", newTransaction);
    }

    console.info("Transaction(s) created, refreshing data");
    await Promise.all([refetchVendors(), refetchTransactions()]);
    
    setShowPurchaseOrderForm(false);
  };

  const handleDeleteIncome = async (income: any) => {
    console.info("Deleting income:", income.description);
    
    // Delete income from database
    await deleteIncome(income.id);
    
    // Remove corresponding cash flow events from calendar
    setCashFlowEvents(prev => prev.filter(event => 
      !(event.type === 'inflow' && 
        event.description === income.description && 
        Math.abs(event.amount - income.amount) < 0.01)
    ));
    
    // Clean up any orphaned transactions
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('cleanup-orphaned-transactions', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
      }
    } catch (error) {
      console.error('Error cleaning up orphaned transactions:', error);
    }
    
    // Refresh safe spending calculations with a delay to ensure DB changes propagate
    setTimeout(() => {
      console.log('🔄 Manually refreshing safe spending after income deletion');
      refetchSafeSpending();
    }, 500);
  };

  const handleEditIncome = (income: any) => {
    // Find the customer name if customerId exists
    const customer = income.customerId 
      ? customers.find(c => c.id === income.customerId)
      : null;
    
    setEditingIncome({
      ...income,
      customer: customer?.name || income.source,
      customerId: income.customerId
    });
    setShowEditIncomeForm(true);
  };

  const handleUpdateIncome = async (updatedIncomeData: any) => {
    const amount = typeof updatedIncomeData.amount === 'string' ? 
      parseFloat(updatedIncomeData.amount) : updatedIncomeData.amount;
    
    const paymentDate = updatedIncomeData.paymentDate || new Date();
    const today = startOfDay(new Date());
    const paymentDateStartOfDay = startOfDay(paymentDate);
    
    // Find the original income item to compare dates
    const originalIncome = incomeItems.find(item => item.id === updatedIncomeData.id);
    
    // Note: In a real Plaid integration, this would update connected account balances
    const success = await updateIncome(updatedIncomeData.id, {
      description: updatedIncomeData.description,
      amount,
      paymentDate,
      source: updatedIncomeData.customer || updatedIncomeData.source || 'Manual Entry',
      status: updatedIncomeData.status || 'pending' as const,
      category: updatedIncomeData.category,
      isRecurring: updatedIncomeData.isRecurring || false,
      recurringFrequency: updatedIncomeData.recurringFrequency,
      notes: updatedIncomeData.notes,
      customerId: updatedIncomeData.customerId
    });

    // Remove any legacy inflow events for this income to prevent duplicates in the calendar
    if (success && originalIncome) {
      setCashFlowEvents(prev =>
        prev.filter(event => {
          if (event.type !== 'inflow') return true;
          const sameDesc = event.description === originalIncome.description;
          const sameAmount = Math.abs(event.amount - originalIncome.amount) < 0.01;
          const sameDay =
            startOfDay(event.date).getTime() === startOfDay(originalIncome.paymentDate).getTime();
          return !(sameDesc && sameAmount && sameDay);
        })
      );
    }

    if (success) {
      setShowEditIncomeForm(false);
      setEditingIncome(null);
    }
  };

  const handleIncomeSubmit = async (incomeData: any) => {
    const amount = typeof incomeData.amount === 'string' ? 
      parseFloat(incomeData.amount) : incomeData.amount;
    
    const paymentDate = incomeData.paymentDate || new Date();
    const today = startOfDay(new Date());
    const paymentDateStartOfDay = startOfDay(paymentDate);
    
    console.info("Adding income amount:", amount);
    console.info("Payment date:", paymentDate);
    console.info("Current bank balance:", bankAccountBalance);
    
    // Check if this is a recurring transaction
    if (incomeData.isRecurring) {
      // Map quarterly to monthly for database (or handle separately)
      let frequency = incomeData.recurringFrequency;
      if (frequency === 'quarterly') {
        // Convert quarterly to monthly with a note
        frequency = 'monthly';
      }

      // Save to recurring_expenses table
      await createRecurringExpense({
        name: incomeData.transactionName || incomeData.description || 'Recurring Income',
        transaction_name: incomeData.transactionName || incomeData.description || 'Recurring Income',
        amount: amount,
        frequency: frequency,
        start_date: format(paymentDate, 'yyyy-MM-dd'),
        end_date: incomeData.endDate ? format(incomeData.endDate, 'yyyy-MM-dd') : null,
        is_active: true,
        type: 'income',
        category: null,
        notes: incomeData.description || incomeData.notes || null,
      });

      toast({
        title: "Recurring income added!",
        description: `${incomeData.description} will appear on the calendar based on ${incomeData.recurringFrequency} schedule`,
      });

      setShowIncomeForm(false);
      setShowRecurringIncomeForm(false);
      return;
    }
    
    // Note: In a real Plaid integration, this would add funds to connected account

    // Add to database - check if it succeeds
    // Handle temporary customer IDs - set to null if temp ID is detected
    const customerId = incomeData.customerId?.startsWith?.('temp-') ? null : incomeData.customerId;
    
    const newIncome = await addIncome({
      description: incomeData.description || 'Income',
      amount: amount,
      paymentDate: paymentDate,
      source: incomeData.customer || incomeData.source || 'Manual Entry',
      status: 'pending' as const,
      category: incomeData.category || '',
      isRecurring: false,
      recurringFrequency: incomeData.recurringFrequency,
      notes: incomeData.notes,
      customerId: customerId
    });

    // Only continue if income was added successfully
    if (!newIncome) {
      return; // addIncome already showed an error toast
    }

    // Create transaction
    await addTransaction({
      type: 'sales_order',
      amount: amount,
      description: incomeData.description || 'Income',
      transactionDate: paymentDate,
      status: paymentDateStartOfDay <= today ? 'completed' : 'pending'
    });

    // Refetch income to update calendar
    await refetchIncome();

    // Do not create a separate cashFlowEvent for planned income.
    // The calendar derives planned inflows from incomeItems to avoid duplicates.

    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleExpenseSubmit = async (expenseData: any) => {
    const amount = typeof expenseData.amount === 'string' ? 
      parseFloat(expenseData.amount) : expenseData.amount;
    
    console.info("Adding expense amount:", amount);
    console.info("Current bank balance:", bankAccountBalance);
    
    // Check if this is a recurring transaction
    if (expenseData.isRecurring) {
      // Map quarterly to monthly for database (or handle separately)
      let frequency = expenseData.recurringFrequency;
      if (frequency === 'quarterly') {
        // Convert quarterly to monthly with a note
        frequency = 'monthly';
      }

      // Save to recurring_expenses table
      await createRecurringExpense({
        name: expenseData.transactionName || expenseData.description || 'Recurring Expense',
        transaction_name: expenseData.transactionName || expenseData.description || 'Recurring Expense',
        amount: amount,
        frequency: frequency,
        start_date: format(expenseData.paymentDate || new Date(), 'yyyy-MM-dd'),
        end_date: expenseData.endDate ? format(expenseData.endDate, 'yyyy-MM-dd') : null,
        is_active: true,
        type: 'expense',
        category: null,
        notes: expenseData.description || expenseData.notes || null,
      });

      toast({
        title: "Recurring expense added!",
        description: `${expenseData.description} will appear on the calendar based on ${expenseData.recurringFrequency} schedule`,
      });

      setShowIncomeForm(false);
      setShowRecurringIncomeForm(false);
      return;
    }
    
    // Note: In a real Plaid integration, this would deduct from connected account

    // Create vendor for expense
    const newVendor = await addVendor({
      name: expenseData.description,
      totalOwed: amount,
      nextPaymentDate: expenseData.paymentDate || new Date(),
      nextPaymentAmount: amount,
      status: 'upcoming',
      category: expenseData.category || 'Other',
      paymentType: 'total',
      description: expenseData.description,
      notes: expenseData.notes
    });

    // Create transaction (link to the created vendor)
    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: expenseData.description || 'Expense',
      vendorId: newVendor?.id,
      transactionDate: expenseData.paymentDate || new Date(),
      status: 'completed'
    });

    // Create cash flow event
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'outflow',
      amount: amount,
      description: expenseData.description || 'Expense',
      date: expenseData.paymentDate || new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    setShowIncomeForm(false);
    setShowRecurringIncomeForm(false);
  };

  const handleCollectIncome = async (income: any) => {
    console.info("Collecting income amount:", income.amount);
    
    // Note: In a real Plaid integration, this would add funds to connected account

    // Create transaction for the transaction log (no need to update total_cash separately)
    await addTransaction({
      type: 'sales_order',
      amount: income.amount,
      description: income.description,
      transactionDate: new Date(),
      status: 'completed'
    });

    // Create cash flow event for calendar
    const newEvent: CashFlowEvent = {
      id: Date.now().toString(),
      type: 'inflow',
      amount: income.amount,
      description: income.description,
      source: income.source,
      date: new Date()
    };
    setCashFlowEvents(prev => [newEvent, ...prev]);

    // Mark income as received instead of deleting
    await updateIncome(income.id, { status: 'received' });
  };

  const handleEditVendorOrder = (vendor: Vendor) => {
    setEditingVendor(vendor);
  };

  const handleSaveVendorOrder = async (updatedVendor: Vendor) => {
    const originalVendor = vendors.find(v => v.id === updatedVendor.id);
    
    // Update the vendor in database - this will trigger realtime subscription
    await updateVendor(updatedVendor.id, updatedVendor);
    
    // Update cash flow events if payment date changed
    if (originalVendor && originalVendor.nextPaymentDate.getTime() !== updatedVendor.nextPaymentDate.getTime()) {
      setCashFlowEvents(prev => prev.map(event => {
        // Find and update the cash flow event for this vendor
        if (event.type === 'outflow' && 
            (event.vendor === updatedVendor.name || 
             event.description?.includes(updatedVendor.name) ||
             (updatedVendor.poName && event.description?.includes(updatedVendor.poName)))) {
          return {
            ...event,
            date: updatedVendor.nextPaymentDate
          };
        }
        return event;
      }));
    }
    
    // Refetch vendors to ensure we have the latest data
    await refetchVendors();
    
    setEditingVendor(null);
  };

  const handleUpdateTransactionDate = async (transactionId: string, newDate: Date, eventType: 'vendor' | 'income') => {
    if (eventType === 'vendor') {
      // Strip the "vendor-tx-" prefix to get the actual transaction ID
      const txId = transactionId.replace('vendor-tx-', '');
      
      // Format date for database (YYYY-MM-DD)
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Update ONLY the transaction's due_date
      const { error: txError } = await supabase
        .from('transactions')
        .update({ due_date: formatDateForDB(newDate) })
        .eq('id', txId);
      
      if (txError) {
        console.error('Error updating transaction date:', txError);
        throw txError;
      }
      
      // Refetch transactions to update UI and signal VendorsOverview
      await refetchTransactions();
      setVendorTxRefresh((v) => v + 1);
    } else if (eventType === 'income') {
      // Strip the "income-" prefix to get the actual income ID
      const incomeId = transactionId.replace('income-', '');
      await updateIncome(incomeId, { paymentDate: newDate });
    }
  };

  const handleDeleteVendorOrder = async (vendor: Vendor) => {
    // Archive to deleted_transactions first
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const paymentDate = vendor.nextPaymentDate ? new Date(vendor.nextPaymentDate) : undefined;
        const amount = vendor.totalOwed || 0;
        const payload: any = {
          user_id: user.id,
          transaction_type: 'vendor',
          original_id: vendor.id,
          name: vendor.name,
          amount,
          description: vendor.poName || vendor.description || 'PO deleted',
          payment_date: paymentDate ? `${paymentDate.getFullYear()}-${String(paymentDate.getMonth()+1).padStart(2,'0')}-${String(paymentDate.getDate()).padStart(2,'0')}` : null,
          status: vendor.status || 'pending',
          category: vendor.category || null,
          metadata: {
            context: 'vendor_delete',
            vendorId: vendor.id,
            poName: vendor.poName,
            totalOwed: vendor.totalOwed,
            nextPaymentDate: vendor.nextPaymentDate,
          }
        };
        const { error: archiveError } = await supabase
          .from('deleted_transactions')
          .insert(payload as any);
        if (archiveError) {
          console.error('Failed to archive deleted vendor:', archiveError);
        }
      }
    } catch (e) {
      console.error('Archive step failed:', e);
    }

    // Delete the vendor completely from the database
    await deleteVendor(vendor.id);

    // Remove any cash flow events associated with this vendor
    setCashFlowEvents(prev => prev.filter(event => 
      !(event.vendor === vendor.name || 
        event.description?.includes(vendor.name) ||
        (vendor.poName && event.description?.includes(vendor.poName)))
    ));

    toast({
      title: 'Vendor transaction deleted',
      description: 'The vendor has been removed and archived to deleted transactions.',
    });

    setEditingVendor(null);
  };

  const handleEditTransaction = (transaction: any) => {
    console.log("Editing transaction:", transaction);
    
    // Route to appropriate edit form based on transaction type
    if (transaction.type === 'inflow') {
      // For income transactions, we need to find the corresponding income item
      const incomeItem = incomeItems.find(item => 
        item.description === transaction.description && 
        Math.abs(item.amount - transaction.amount) < 0.01
      );
      
      if (incomeItem) {
        // TODO: Open income edit form - for now, show alert
        handleEditIncome(incomeItem);
      } else {
        alert(`Income item not found for transaction: ${transaction.description}`);
      }
    } else if (transaction.type === 'purchase-order' || transaction.type === 'outflow' || transaction.vendor) {
      // For vendor transactions, find the corresponding vendor
      const vendor = vendors.find(v => 
        v.name === transaction.vendor || 
        transaction.description.includes(v.name) ||
        v.poName === transaction.poName
      );
      
      if (vendor) {
        setEditingVendor(vendor);
      } else {
        alert(`Vendor not found for transaction: ${transaction.description}`);
      }
    } else {
      alert(`Unknown transaction type: ${transaction.type}\nTransaction: ${transaction.description}`);
    }
  };


  const handleUpdateCashBalance = async () => {
    // This function syncs with real bank account balance from connected accounts
    console.log("Syncing cash balance - Bank account balance:", bankAccountBalance);
    console.log("Cash balance is now managed through Plaid integration");
  };

  const handleManualMatchConfirm = async (matchId: string, matchType: 'income' | 'vendor') => {
    if (!manualMatchDialog.transaction) return;
    
    try {
      // Archive the bank transaction
      const { error: archiveError } = await supabase
        .from('bank_transactions')
        .update({
          archived: true,
          matched_transaction_id: matchId,
          matched_type: matchType,
          updated_at: new Date().toISOString()
        })
        .eq('id', manualMatchDialog.transaction.id);

      if (archiveError) throw archiveError;

      // Update income or vendor
      if (matchType === 'income') {
        await updateIncome(matchId, { status: 'received' });
      } else {
        const vendor = vendors.find(v => v.id === matchId);
        if (vendor) {
          await updateVendor(matchId, {
            totalOwed: Math.max(0, vendor.totalOwed - Math.abs(manualMatchDialog.transaction.amount))
          });
        }
      }

      toast({
        title: 'Transaction matched',
        description: 'Bank transaction has been matched and archived.',
      });

      await Promise.all([refetchIncome(), refetchVendors(), refetchSafeSpending()]);
    } catch (error) {
      console.error('Failed to match transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to match transaction. Please try again.',
        variant: 'destructive',
      });
    }
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

  // No sample events for new users
  const sampleEvents: any[] = [];

  // Convert cash flow events to calendar format (no conversion needed since types now match)
  const calendarEvents = cashFlowEvents;

  // Convert vendor transactions to calendar events (only show POs with vendors assigned)
  const vendorEvents: CashFlowEvent[] = transactions
    .filter(tx => {
      // Only show purchase orders with vendor IDs
      if (tx.type !== 'purchase_order' || !tx.vendorId) {
        return false;
      }
      // Exclude completed transactions
      if (tx.status === 'completed') {
        return false;
      }
      // Exclude .1 transactions (paid portion of partial payments)
      if (tx.description?.endsWith('.1')) return false;
      // Exclude partially_paid parent transactions (they're replaced by .2 transactions)
      const dbStatus = (tx as any).status;
      if (dbStatus === 'partially_paid') return false;
      // Allow .2 transactions (remaining balance with new due date) to show
      return true;
    })
    .map(tx => {
      const vendor = vendors.find(v => v.id === tx.vendorId);
      // Use dueDate if available (for net terms), otherwise use transactionDate
      const eventDate = tx.dueDate || tx.transactionDate;
      
      console.log('🔍 Creating vendor event:', {
        txId: tx.id,
        description: tx.description,
        dueDate: tx.dueDate,
        transactionDate: tx.transactionDate,
        eventDate: eventDate,
        status: tx.status,
        creditCardId: tx.creditCardId
      });
      
      return {
        id: `vendor-tx-${tx.id}`,
        type: 'outflow' as const,
        amount: tx.amount,
        description: tx.description || `${vendor?.name || 'Vendor'} - Payment Due`,
        vendor: vendor?.name,
        creditCardId: tx.creditCardId,
        date: eventDate
      };
    });
  
  console.log('🔍 Total vendor events for calendar:', vendorEvents.length, vendorEvents);

  // Convert income items to calendar events (exclude received income)
  const incomeEvents: CashFlowEvent[] = incomeItems
    .filter(income => income.status !== 'received')
    .map(income => ({
      id: `income-${income.id}`,
      type: 'inflow' as const,
      amount: income.amount,
      description: income.description,
      source: income.source,
      date: income.paymentDate
    }));

  // Prevent duplicate inflows: remove any legacy cashFlowEvents that mirror existing income items
  useEffect(() => {
    setCashFlowEvents(prev =>
      prev.filter(e => {
        if (e.type !== 'inflow') return true;
        // Drop inflow events that match an income item on the same day with same desc and amount
        return !incomeItems.some(inc =>
          inc.description === e.description &&
          Math.abs(inc.amount - e.amount) < 0.01 &&
          startOfDay(inc.paymentDate).getTime() === startOfDay(e.date).getTime()
        );
      })
    );
  }, [incomeItems]);

  // Clean up stale cash flow events when vendors change
  React.useEffect(() => {
    setCashFlowEvents(prev =>
      prev.filter(e => {
        if (!e.vendor) return true;
        
        // Check if vendor still exists by name
        const vendorExists = vendors.some(v => v.name === e.vendor);
        if (!vendorExists) return false; // vendor deleted
        
        // Check if vendor is fully paid
        const vendor = vendors.find(v => v.name === e.vendor);
        if (vendor && ((vendor.totalOwed ?? 0) <= 0 || vendor.status === 'paid')) {
          return false; // fully paid
        }
        
        return true;
      })
    );
  }, [vendors]);

  // Clear all cash flow events when all data is deleted
  React.useEffect(() => {
    if (vendors.length === 0 && incomeItems.length === 0 && transactions.length === 0) {
      setCashFlowEvents([]);
    }
  }, [vendors.length, incomeItems.length, transactions.length]);

  // Get credit card due date events - show statement balance as expense on due date
  const creditCardEvents: CashFlowEvent[] = creditCards.length > 0
    ? creditCards
        .filter(card => card.payment_due_date && card.balance > 0)
        .map(card => {
          // If pay_minimum is enabled, show minimum payment; otherwise show statement balance
          const paymentAmount = card.pay_minimum 
            ? card.minimum_payment 
            : (card.statement_balance || card.balance);
          
          return {
            id: `credit-payment-${card.id}`,
            type: 'credit-payment' as const,
            amount: paymentAmount,
            description: `${card.institution_name} - ${card.account_name} Payment${card.pay_minimum ? ' (Min Only)' : ''}`,
            creditCard: card.institution_name,
            date: new Date(card.payment_due_date!)
          };
        })
    : [];

  // Add forecasted next month payments for cards with forecast enabled
  const forecastedCreditCardEvents: CashFlowEvent[] = creditCards.length > 0
    ? creditCards
        .filter(card => card.forecast_next_month && card.payment_due_date)
        .map(card => {
          // Calculate projected usage: limit - available - statement balance
          const projectedAmount = card.credit_limit - card.available_credit - (card.statement_balance || card.balance);
          
          if (projectedAmount <= 0) return null;
          
          // Add one month to the current due date
          const nextDueDate = new Date(card.payment_due_date!);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          
          return {
            id: `credit-forecast-${card.id}`,
            type: 'credit-payment' as const,
            amount: projectedAmount,
            description: `${card.institution_name} - ${card.account_name} (Forecasted)`,
            creditCard: card.institution_name,
            date: nextDueDate
          };
        })
        .filter(Boolean) as CashFlowEvent[]
    : [];

  // Convert vendor payments (actual cash outflows) to calendar events
  const vendorPaymentEvents: CashFlowEvent[] = transactions
    .filter(t => t.type === 'vendor_payment')
    .map(t => ({
      id: `vendor-payment-${t.id}`,
      type: 'outflow' as const,
      amount: t.amount,
      description: t.description,
      vendor: t.vendorId ? vendors.find(v => v.id === t.vendorId)?.name : undefined,
      date: t.transactionDate
    }));

  // Generate recurring transaction events for calendar (show next 12 months)
  const recurringEvents: CashFlowEvent[] = useMemo(() => {
    const events: CashFlowEvent[] = [];
    const rangeStart = startOfDay(new Date());
    const rangeEnd = addDays(rangeStart, 365); // Next 12 months

    recurringExpenses.forEach(recurring => {
      const dates = generateRecurringDates(recurring, rangeStart, rangeEnd);
      
      dates.forEach(date => {
        events.push({
          id: `recurring-${recurring.id}-${date.getTime()}`,
          type: recurring.type === 'income' ? 'inflow' : 'outflow',
          amount: Number(recurring.amount),
          description: `${recurring.transaction_name || recurring.name}`, // Full description stored here
          date: date,
          source: recurring.type === 'income' ? 'Recurring' : undefined,
          vendor: recurring.type === 'expense' ? 'Recurring' : undefined, // Show "Recurring" as vendor name
        });
      });
    });

    return events;
  }, [recurringExpenses]);

  // Convert Amazon payouts to calendar events (always include all payouts)
  const amazonPayoutEvents: CashFlowEvent[] = amazonPayouts
    .map(payout => ({
      id: `amazon-payout-${payout.id}`,
      type: 'inflow' as const,
      amount: payout.total_amount,
      description: (payout.status as string) === 'forecasted' 
        ? `Amazon Payout (Forecasted) - ${payout.marketplace_name}`
        : `Amazon Payout - ${payout.marketplace_name} (${payout.status})`,
      source: (payout.status as string) === 'forecasted' ? 'Amazon-Forecasted' : 'Amazon',
      date: new Date(payout.payout_date)
    }));

  // Combine all events for calendar - only include real user data
  const allCalendarEvents = [...calendarEvents, ...vendorPaymentEvents, ...vendorEvents, ...incomeEvents, ...creditCardEvents, ...forecastedCreditCardEvents, ...recurringEvents, ...amazonPayoutEvents];

  // Trigger safe spending recalculation when any financial data changes
  useEffect(() => {
    console.log('📊 Calendar events changed, triggering safe spending recalculation');
    refetchSafeSpending();
  }, [transactions.length, incomeItems.length, vendors.length, recurringExpenses.length, creditCards.length, refetchSafeSpending]);

  // Debug: Log all calendar events to check for duplicates
  console.log("📅 All Calendar Events:", {
    total: allCalendarEvents.length,
    cashFlowEvents: calendarEvents.length,
    vendorEvents: vendorEvents.length,
    incomeEvents: incomeEvents.length,
    creditCardEvents: creditCardEvents.length,
    recurringEvents: recurringEvents.length,
    allEvents: allCalendarEvents.map(e => ({ 
      id: e.id, 
      type: e.type, 
      amount: e.amount, 
      desc: e.description, 
      date: format(e.date, 'MMM dd')
    }))
  });

  // Log cash values for debugging
  console.log("Dashboard - bankAccountBalance:", bankAccountBalance, "accounts connected:", accounts.length);
  
  // Calculate total transactions (income - expenses) - only count transactions on or before today
  const today = startOfDay(new Date());
  const transactionTotal = transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount);
    const transactionDate = startOfDay(transaction.transactionDate);
    
    // Only count transactions on or before today and that are completed
    if (transactionDate > today || transaction.status !== 'completed') {
      return total;
    }
    
    // Income: customer_payment, sales_order
    // Expenses: purchase_order, vendor_payment
    const isIncome = transaction.type === 'customer_payment' || transaction.type === 'sales_order';
    return isIncome ? total + amount : total - amount;
  }, 0);
  
  console.log('Balance Debug:', {
    userSettingsCash,
    transactionTotal,
    transactionCount: transactions.length,
    transactions: transactions.map(t => ({ type: t.type, amount: t.amount, date: t.transactionDate }))
  });
  
  // Use bank account balance if connected, otherwise calculate from user settings + transactions
  const displayCash = accounts.length > 0 ? displayBankBalance : userSettingsCash + transactionTotal;

  // Calculate today's activity for insights
  const todayInflow = transactions
    .filter(t => startOfDay(t.transactionDate).getTime() === today.getTime() && 
                 (t.type === 'customer_payment' || t.type === 'sales_order') &&
                 t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const todayOutflow = transactions
    .filter(t => startOfDay(t.transactionDate).getTime() === today.getTime() && 
                 (t.type === 'purchase_order' || t.type === 'vendor_payment') &&
                 t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const upcomingExpenses = allCalendarEvents
    .filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const sevenDaysOut = addDays(today, 7);
      return eventDate > today && eventDate <= sevenDaysOut &&
             event.type === 'outflow';
    })
    .reduce((sum, event) => sum + event.amount, 0);

  // Calculate projected balances using the same logic as the calendar
  // This ensures the insights panel shows the ACTUAL minimum from the calendar
  const calculateCalendarMinimum = () => {
    const endDate = addDays(today, 90); // Next 90 days (3 months)
    const dailyBalances: Array<{ date: Date; balance: number }> = [];
    let runningBalance = displayBankBalance; // Start with current bank balance (based on toggle)
    
    let currentDate = new Date(today);
    while (currentDate <= endDate) {
      currentDate.setHours(0, 0, 0, 0);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Get all events for this day
      const dayEvents = allCalendarEvents.filter(event => 
        format(event.date, 'yyyy-MM-dd') === dateStr
      );
      
      // Calculate net change for the day (exactly like the calendar does)
      const dailyInflow = dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0);
      const dailyOutflow = dayEvents.filter(e => e.type !== 'inflow').reduce((sum, e) => sum + e.amount, 0);
      const dailyChange = dailyInflow - dailyOutflow;
      
      runningBalance += dailyChange;
      dailyBalances.push({ date: new Date(currentDate), balance: runningBalance });
      
      currentDate = addDays(currentDate, 1);
    }
    
    // Find the minimum balance
    if (dailyBalances.length === 0) return { balance: displayBankBalance, date: format(today, 'yyyy-MM-dd') };
    
    const minBalanceData = dailyBalances.reduce((min, current) => 
      current.balance < min.balance ? current : min
    );
    
    return {
      balance: minBalanceData.balance,
      date: format(minBalanceData.date, 'yyyy-MM-dd')
    };
  };

  const renderSettingsContent = () => {
    switch (settingsSection) {
      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-muted animate-pulse rounded"></div>
                    <div className="h-10 bg-muted animate-pulse rounded"></div>
                  </div>
                  <div className="h-10 bg-muted animate-pulse rounded"></div>
                  <div className="h-10 bg-muted animate-pulse rounded"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name">First Name</Label>
                      <Input 
                        id="first-name" 
                        defaultValue={profile?.first_name || ""} 
                        placeholder="Enter your first name"
                        onBlur={(e) => handleProfileChange('first_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input 
                        id="last-name" 
                        defaultValue={profile?.last_name || ""} 
                        placeholder="Enter your last name"
                        onBlur={(e) => handleProfileChange('last_name', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={user?.email || ""} 
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed here. Contact support if needed.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input 
                      id="company" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter your company name"
                      onBlur={(e) => {
                        const trimmed = e.target.value.trim();
                        if (trimmed !== profile?.company) {
                          handleProfileChange('company', trimmed);
                        }
                      }}
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Changes are saved automatically when you click away.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-currency">Default Currency</Label>
                    <Select 
                      value={selectedCurrency} 
                      onValueChange={(value) => {
                        setSelectedCurrency(value);
                        updateProfileMutation.mutate({ currency: value });
                      }}
                    >
                      <SelectTrigger id="default-currency" className="bg-background">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar (C$)</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar (A$)</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                        <SelectItem value="CNY">CNY - Chinese Yuan (¥)</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                        <SelectItem value="MXN">MXN - Mexican Peso ($)</SelectItem>
                        <SelectItem value="BRL">BRL - Brazilian Real (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'team':
        return <TeamManagement />;
      case 'bank-accounts':
        return <BankAccountManagement />;
      case 'vendors':
        return <VendorManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'recurring-expenses':
        return <RecurringExpenseManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'amazon':
        return <AmazonManagement />;
      case 'credit-cards':
        return <CreditCardManagement />;
      case 'invoices':
        return <BillingInvoices />;
      case 'forecast-settings':
        return <ForecastSettings />;
      case 'export':
        return <DataExport />;
      case 'appearance':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the theme for the application
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="justify-start"
                  >
                    {getThemeIcon('light')}
                    <span className="ml-2">Light</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="justify-start"
                  >
                    {getThemeIcon('dark')}
                    <span className="ml-2">Dark</span>
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className="justify-start"
                  >
                    {getThemeIcon('system')}
                    <span className="ml-2">System</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'data-management':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isWebsiteAdmin && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Restore Admin Access</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        If you lost admin access after clearing data, use this to restore your admin and owner roles.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRestoreAdminAccess}
                        className="border-blue-300 dark:border-blue-700"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Restore Admin Access
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {isWebsiteAdmin && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Database className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">Generate Admin Test Data</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create sample users, support tickets, and referrals for testing the admin dashboard. This data persists after clearing your own account.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGenerateAdminTestData}
                        className="border-green-300 dark:border-green-700"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Generate Test Data
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Generate Sample Amazon Data</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create a sample Amazon account with 6 months of historical payouts and transactions (1,800+ records with 5-figure amounts) for testing forecasts and insights.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/sample-data')}
                      className="border-blue-300 dark:border-blue-700"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Generate Amazon Data
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive mb-1">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Clear all your financial data including vendors, income, and transactions. This action cannot be undone.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear All Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-4">
                              <p className="text-destructive font-semibold">This action cannot be undone!</p>
                              <div>
                                <p className="mb-2">This will permanently delete all of your:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1 mb-3">
                                  <li>Vendor purchase orders</li>
                                  <li>Income transactions</li>
                                  <li>Transaction history</li>
                                  <li>All financial data</li>
                                </ul>
                                <p className="font-semibold">You will start from zero balance with no records.</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="confirm-clear"
                                  checked={clearDataConfirmation}
                                  onCheckedChange={(checked) => setClearDataConfirmation(checked === true)}
                                />
                                <Label
                                  htmlFor="confirm-clear"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  I understand this action cannot be undone and will delete all my data
                                </Label>
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setClearDataConfirmation(false)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              handleClearAllData();
                              setClearDataConfirmation(false);
                            }}
                            disabled={!clearDataConfirmation}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Yes, Clear All Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Profile settings will be shown here.</p>
            </CardContent>
          </Card>
        );
    }
  };

  const calendarMinimum = calculateCalendarMinimum();
  
  console.log('📊 Calendar-based Minimum Balance:', {
    amount: calendarMinimum.balance,
    date: calendarMinimum.date,
    comparedTo: safeSpendingData?.calculation?.lowest_projected_balance
  });

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <>
            <OverviewStats 
              totalCash={displayCash} 
              events={allCalendarEvents}
              onUpdateCashBalance={handleUpdateCashBalance}
              onTransactionUpdate={() => {
                refetchVendorTransactions();
                refetchSafeSpending();
              }}
              pendingIncomeToday={pendingIncomeToday}
              useAvailableBalance={useAvailableBalance}
            />
            
            {/* Transaction Match Notification */}
            <TransactionMatchNotification 
              unmatchedCount={unmatchedTransactionsCount} 
              onNavigate={() => handleSectionChange("match-transactions")}
            />
            
            
            {/* Row 1: Cash Flow Calendar and AI Insights (Side by Side) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[700px]">
              <div className="lg:col-span-2 h-full">
                <CashFlowCalendar 
                  events={allCalendarEvents} 
                  totalCash={displayCash}
                  onEditTransaction={handleEditTransaction}
                  onUpdateTransactionDate={handleUpdateTransactionDate}
                  todayInflow={todayInflow}
                  todayOutflow={todayOutflow}
                  upcomingExpenses={upcomingExpenses}
                  incomeItems={incomeItems}
                  bankAccountBalance={displayBankBalance}
                  projectedDailyBalances={(safeSpendingData?.calculation?.daily_balances || []).map(d => ({ 
                    date: new Date(d.date), 
                    balance: d.balance 
                  }))}
                  vendors={vendors}
                  onVendorClick={handleEditVendorOrder}
                  onIncomeClick={handleEditIncome}
                  reserveAmount={reserveAmount}
                />
              </div>
              <div className="lg:col-span-1 h-full">
                <CashFlowInsights
                  currentBalance={displayCash}
                  dailyInflow={todayInflow}
                  dailyOutflow={todayOutflow}
                  upcomingExpenses={upcomingExpenses}
                  events={allCalendarEvents}
                  vendors={vendors}
                  income={incomeItems}
                  safeSpendingLimit={safeSpendingData?.safe_spending_limit || 0}
                  reserveAmount={reserveAmount}
                  projectedLowestBalance={safeSpendingData?.calculation?.lowest_projected_balance || calendarMinimum.balance}
                  lowestBalanceDate={calendarMinimum.date}
                  safeSpendingAvailableDate={safeSpendingData?.calculation?.safe_spending_available_date}
                  nextBuyingOpportunityBalance={safeSpendingData?.calculation?.next_buying_opportunity_balance}
                  nextBuyingOpportunityDate={safeSpendingData?.calculation?.next_buying_opportunity_date}
                  nextBuyingOpportunityAvailableDate={safeSpendingData?.calculation?.next_buying_opportunity_available_date}
                  allBuyingOpportunities={safeSpendingData?.calculation?.all_buying_opportunities || []}
                  onUpdateReserveAmount={updateReserveAmount}
                  canUpdateReserve={canUpdateReserve}
                  lastReserveUpdate={lastReserveUpdate}
                  transactionMatchButton={
                    <TransactionMatchButton 
                      matches={matches}
                      onMatchAll={async () => {
                        // Match all transactions instantly
                        for (const match of matches) {
                          if (match.type === 'income' && match.matchedIncome) {
                            await updateIncome(match.matchedIncome.id, { status: 'received' });
                            await addTransaction({
                              type: 'customer_payment',
                              amount: match.matchedIncome.amount,
                              description: `Auto-matched: ${match.matchedIncome.source} - ${match.matchedIncome.description}`,
                              customerId: match.matchedIncome.customerId,
                              transactionDate: new Date(),
                              status: 'completed'
                            });
                          } else if (match.type === 'vendor' && match.matchedVendorTransaction) {
                            // Mark the vendor transaction as paid and archive
                            await supabase
                              .from('transactions')
                              .update({ status: 'completed', archived: true })
                              .eq('id', match.matchedVendorTransaction.id);
                              
                            await addTransaction({
                              type: 'vendor_payment',
                              amount: Math.abs(match.bankTransaction.amount),
                              description: `Auto-matched: Payment to ${match.matchedVendorTransaction.vendorName} - ${match.matchedVendorTransaction.description}`,
                              transactionDate: new Date(),
                              status: 'completed'
                            });
                          }
                        }
                        
                        toast({
                          title: 'All matches completed',
                          description: `${matches.length} transactions have been automatically matched.`,
                        });
                        
                        refetchIncome();
                        refetchVendors();
                      }}
                      onReviewMatches={() => navigate("/bank-transactions")}
                    />
                  }
                />
              </div>
            </div>
          </>
        );
      
      case "notifications":
        return <Notifications />;
      
      case "match-transactions":
        return <MatchTransactions />;
      
      case "transactions":
        return (
          <TransactionsView
            bankTransactions={bankTransactions}
            onVendorUpdate={() => {
              refetchVendors();
              refetchTransactions();
              setVendorTxRefresh((v) => v + 1);
              // Refresh safe spending and credit cards after vendor transaction updates
              setTimeout(() => {
                refetchSafeSpending();
                refetchCreditCards();
              }, 500);
            }}
            refreshKey={vendorTxRefresh}
            incomeItems={incomeItems}
            onCollectToday={handleCollectIncome}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncome}
            onMatchTransaction={async (income) => {
              await addTransaction({
                type: 'customer_payment',
                amount: income.amount,
                description: `Matched: ${income.source} - ${income.description}`,
                customerId: income.customerId,
                transactionDate: new Date(),
                status: 'completed'
              });
            }}
          />
        );
      
      case "bank-transactions":
        const handleSyncAllTransactions = async () => {
          setSyncingTransactions(true);
          try {
            const syncPromises = allFinancialAccounts.map(account =>
              supabase.functions.invoke('sync-plaid-transactions', {
                body: { 
                  accountId: account.id, 
                  isInitialSync: false,
                  accountType: account.type
                },
              })
            );

            const results = await Promise.all(syncPromises);
            const hasErrors = results.some(r => r.error);

            if (hasErrors) {
              toast({
                title: "Sync completed with errors",
                description: "Some accounts failed to sync. Please try again.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Transactions synced",
                description: "All bank transactions have been updated.",
              });
            }
          } catch (error) {
            toast({
              title: "Sync failed",
              description: "Failed to sync transactions. Please try again.",
              variant: "destructive",
            });
          } finally {
            setSyncingTransactions(false);
          }
        };

        const handleBankMatchAll = async () => {
          setMatchingAll(true);
          try {
            for (const match of matches) {
              if (match.type === 'income' && match.matchedIncome) {
                await updateIncome(match.matchedIncome.id, { status: 'received' });
                await addTransaction({
                  type: 'customer_payment',
                  amount: match.matchedIncome.amount,
                  description: `Auto-matched: ${match.matchedIncome.source} - ${match.matchedIncome.description}`,
                  customerId: match.matchedIncome.customerId,
                  transactionDate: new Date(),
                  status: 'completed'
                });
                } else if (match.type === 'vendor' && match.matchedVendorTransaction) {
                  // Mark the vendor transaction as paid and archive
                  await supabase
                    .from('transactions')
                    .update({ status: 'completed', archived: true })
                    .eq('id', match.matchedVendorTransaction.id);
                  
                await addTransaction({
                  type: 'vendor_payment',
                  amount: Math.abs(match.bankTransaction.amount),
                  description: `Auto-matched: Payment to ${match.matchedVendorTransaction.vendorName} - ${match.matchedVendorTransaction.description}`,
                  transactionDate: new Date(),
                  status: 'completed'
                });
              }
            }
            
            toast({
              title: 'All matches completed',
              description: `${matches.length} transactions have been automatically matched.`,
            });
            
            refetchIncome();
            refetchVendors();
          } finally {
            setMatchingAll(false);
          }
        };

        const handleBankManualMatch = (transaction: BankTransaction) => {
          const txMatches = matches.filter(m => m.bankTransaction.id === transaction.id);
          if (txMatches.length > 0) {
            setMatchReviewDialog({ open: true, match: txMatches[0] });
          }
        };

        const handleOpenManualMatch = (transaction: BankTransaction) => {
          setManualMatchDialog({ open: true, transaction });
        };

        const getMatchesForBankTransaction = (txId: string) => {
          return matches.filter(m => m.bankTransaction.id === txId);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Bank Transactions</h2>
                <p className="text-sm text-muted-foreground">
                  Last synced: {accounts[0]?.last_sync ? format(new Date(accounts[0].last_sync), 'MMM dd, yyyy h:mm a') : 'Never'} • Syncs every 3 hours
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Transaction history retained for 45 days • Pending transactions included in balance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Filter by account" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all" className="cursor-pointer">
                      All Accounts ({allBankTransactions.length})
                    </SelectItem>
                    {allFinancialAccounts.map((account) => {
                      const accountTxCount = allBankTransactions.filter(tx => tx.accountId === account.id).length;
                      return (
                        <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            {account.type === 'bank' ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <CreditCardIcon className="h-4 w-4" />
                            )}
                            <span>{account.institution_name} - {account.account_name}</span>
                            <Badge variant="secondary" className="ml-auto">{accountTxCount}</Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedBankAccountId === 'all' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSyncingTransactions(true);
                      try {
                        const syncPromises = allFinancialAccounts.map(account =>
                          supabase.functions.invoke('sync-plaid-transactions', {
                            body: { 
                              accountId: account.id, 
                              isInitialSync: false,
                              accountType: account.type
                            },
                          })
                        );
                        const results = await Promise.all(syncPromises);
                        const hasErrors = results.some(r => r.error);
                        if (hasErrors) {
                          toast({
                            title: "Sync completed with errors",
                            description: "Some accounts failed to sync. Please try again.",
                            variant: "destructive",
                          });
                        } else {
                          toast({
                            title: "Transactions synced",
                            description: "All bank transactions have been updated.",
                          });
                        }
                        setTimeout(() => {
                          refetchBankTransactions();
                          setSyncingTransactions(false);
                        }, 2000);
                      } catch (error) {
                        console.error('Error syncing all transactions:', error);
                        toast({
                          title: "Sync failed",
                          description: "Failed to sync transactions. Please try again.",
                          variant: "destructive",
                        });
                        setSyncingTransactions(false);
                      }
                    }}
                    disabled={syncingTransactions || allFinancialAccounts.length === 0}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncingTransactions ? 'animate-spin' : ''}`} />
                    {syncingTransactions ? 'Syncing All...' : 'Sync All Accounts'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBankSync}
                    disabled={isBankSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isBankSyncing ? 'animate-spin' : ''}`} />
                    {isBankSyncing ? 'Syncing...' : 'Sync Account'}
                  </Button>
                )}
                {matches.length > 0 && (
                  <TransactionMatchButton 
                    matches={matches}
                    onMatchAll={handleBankMatchAll}
                    onReviewMatches={() => {}}
                  />
                )}
              </div>
            </div>
            {isBankTransactionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No bank accounts connected yet.</p>
                <button onClick={() => navigate('/settings')} className="btn btn-primary">
                  Connect Bank Account
                </button>
              </div>
            ) : bankTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found.
              </div>
            ) : (
              <div className="space-y-6">
                {transactionsByAccount.map(({ accountName, transactions }) => (
                  <div key={accountName} className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{accountName}</h3>
                      <Badge variant="secondary" className="ml-2">{transactions.length} transactions</Badge>
                    </div>
                    {transactions.map((tx) => {
                  const txMatches = getMatchesForBankTransaction(tx.id);
                  const hasMatch = txMatches.length > 0;
                  const topMatch = txMatches[0];
                  
                  return (
                    <div
                      key={tx.id}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
                        hasMatch 
                          ? 'border-green-500/40 bg-gradient-to-r from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 hover:shadow-lg hover:shadow-green-500/10' 
                          : 'border-border bg-card hover:shadow-md hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center p-5">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                            tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {tx.type === 'credit' ? (
                              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-base truncate">
                                {tx.merchantName || tx.description?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Unknown'}
                              </p>
                              {tx.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>}
                              {hasMatch && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">{Math.round(topMatch.matchScore * 100)}% Match</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(tx.date, 'MMM dd, yyyy')}</span>
                              {tx.category && tx.category !== 'Uncategorized' && <Badge variant="secondary" className="text-xs">{tx.category}</Badge>}
                            </div>
                            {hasMatch && topMatch && (
                              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-muted-foreground">Matched with:</span>
                                <span className="font-medium text-sm text-green-700 truncate">
                                  {topMatch.type === 'income' ? `${topMatch.matchedIncome?.source} - ${topMatch.matchedIncome?.description}` : `${topMatch.matchedVendorTransaction?.vendorName} - ${topMatch.matchedVendorTransaction?.description}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === 'debit' ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{tx.type === 'debit' ? 'Debit' : 'Credit'}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {hasMatch ? (
                              <Button size="sm" onClick={() => handleBankManualMatch(tx)} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">Review Match</Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleOpenManualMatch(tx)} className="border-primary/50 hover:bg-primary hover:text-primary-foreground">Manual Match</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case "financials":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Financials</h2>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setFinancialsView("bank-accounts")}
                  className={`px-4 py-2 rounded-md transition-all ${
                    financialsView === "bank-accounts"
                      ? "bg-background shadow-sm font-semibold text-primary"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  Bank Accounts
                </button>
                <button
                  onClick={() => setFinancialsView("credit-cards")}
                  className={`px-4 py-2 rounded-md transition-all ${
                    financialsView === "credit-cards"
                      ? "bg-background shadow-sm font-semibold text-primary"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  Credit Cards
                </button>
                <button
                  onClick={() => setFinancialsView("amazon-payouts")}
                  className={`px-4 py-2 rounded-md transition-all ${
                    financialsView === "amazon-payouts"
                      ? "bg-background shadow-sm font-semibold text-primary"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  Amazon Payouts
                </button>
              </div>
            </div>
            {financialsView === "bank-accounts" && <BankAccounts useAvailableBalance={useAvailableBalance} onToggleBalance={setUseAvailableBalance} />}
            {financialsView === "credit-cards" && <CreditCards />}
            {financialsView === "amazon-payouts" && <AmazonPayouts />}
          </div>
        );
      
      case "recurring":
        return <RecurringExpensesOverview />;
      
      case "scenario-planning":
        return <ScenarioPlanner />;
      
      case "analytics":
        return <Analytics />;
      
      case "ai-forecast":
        return <AmazonForecast />;
      
      case "document-storage":
        return <DocumentStorage />;
      
      case "support":
        return <Support />;
      
      case "referrals":
        return <ReferralDashboardContent />;
      
      case "settings":
        return (
          <div className="grid gap-6 lg:grid-cols-4 relative z-10">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <Card className="relative z-10">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <SidebarNavigation 
                    activeSection={settingsSection}
                    onSectionChange={setSettingsSection}
                    isAdmin={true}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 relative z-10">
              {renderSettingsContent()}
            </div>
          </div>
        );
      
      case "team-management":
        return <TeamManagement />;
      
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
          onFlexReportClick={() => navigate('/flex-report')}
          matchCount={uniquePoMatchCount}
        />
        
        <div className="flex-1 overflow-y-auto relative">
          {/* Header with sidebar trigger */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center min-h-[120px] px-6">
              <SidebarTrigger className="mr-4 self-start mt-6" />
              <DashboardHeader />
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {renderSection()}
          </div>

          <FloatingMenu
            onAddPurchaseOrder={handleOpenPurchaseOrderForm}
            onAddIncome={() => setShowIncomeForm(true)}
            onAddRecurringIncome={() => setShowRecurringIncomeForm(true)}
          />

          {showPurchaseOrderForm && (
            <PurchaseOrderForm
              vendors={formVendors}
              open={showPurchaseOrderForm}
              onOpenChange={setShowPurchaseOrderForm}
              onSubmitOrder={handlePurchaseOrderSubmit}
              onDeleteAllVendors={deleteAllVendors}
              onAddVendor={addVendor}
            />
          )}


          {showIncomeForm && (
            <IncomeForm
              open={showIncomeForm}
              onOpenChange={setShowIncomeForm}
              onSubmitIncome={handleIncomeSubmit}
              onSubmitExpense={handleExpenseSubmit}
              customers={customers}
              onAddCustomer={addCustomer}
            />
          )}

          {showRecurringIncomeForm && (
            <IncomeForm
              open={showRecurringIncomeForm}
              onOpenChange={setShowRecurringIncomeForm}
              onSubmitIncome={handleIncomeSubmit}
              onSubmitExpense={handleExpenseSubmit}
              isRecurring={true}
              customers={customers}
              onAddCustomer={addCustomer}
            />
          )}

          {showEditIncomeForm && (
            <IncomeForm
              open={showEditIncomeForm}
              onOpenChange={setShowEditIncomeForm}
              onSubmitIncome={handleUpdateIncome}
              onSubmitExpense={handleExpenseSubmit}
              editingIncome={editingIncome}
              customers={customers}
              onAddCustomer={addCustomer}
            />
          )}

          {editingVendor && (
            <VendorOrderEditModal
              vendor={editingVendor as any}
              open={!!editingVendor}
              onOpenChange={(open) => !open && setEditingVendor(null)}
              onSave={handleSaveVendorOrder}
              onDelete={handleDeleteVendorOrder}
            />
          )}

          {/* Match Review Dialog */}
          <MatchReviewDialog
            open={matchReviewDialog.open}
            onOpenChange={(open) => setMatchReviewDialog({ open, match: null })}
            match={matchReviewDialog.match}
            onAccept={async () => {
              if (!matchReviewDialog.match) return;
              
              const match = matchReviewDialog.match;
              
              if (match.type === 'income' && match.matchedIncome) {
                // Mark income as received
                await updateIncome(match.matchedIncome.id, { status: 'received' });
                
                // Create completed transaction
                await addTransaction({
                  type: 'customer_payment',
                  amount: match.matchedIncome.amount,
                  description: `Matched: ${match.matchedIncome.source} - ${match.matchedIncome.description}`,
                  customerId: match.matchedIncome.customerId,
                  transactionDate: new Date(),
                  status: 'completed'
                });
                
                toast({
                  title: 'Match accepted',
                  description: 'Income has been matched with bank transaction.',
                });
              } else if (match.type === 'vendor' && match.matchedVendorTransaction) {
                // Mark vendor transaction as paid
                await markAsPaid(match.matchedVendorTransaction.id);
                
                toast({
                  title: 'Match accepted',
                  description: 'Vendor payment has been matched with bank transaction.',
                });
              }
              
              setMatchReviewDialog({ open: false, match: null });
              refetchIncome();
              refetchVendors();
            }}
            onReject={() => {
              setMatchReviewDialog({ open: false, match: null });
            }}
          />

          {/* Manual Match Dialog */}
          <ManualMatchDialog
            open={manualMatchDialog.open}
            onOpenChange={(open) => setManualMatchDialog({ open, transaction: null })}
            transaction={manualMatchDialog.transaction ? {
              id: manualMatchDialog.transaction.id,
              description: manualMatchDialog.transaction.description,
              merchantName: manualMatchDialog.transaction.merchantName,
              amount: manualMatchDialog.transaction.amount,
              date: manualMatchDialog.transaction.date,
              type: manualMatchDialog.transaction.type,
            } : null}
            vendorTransactions={vendorTransactions?.filter(tx => tx.status === 'pending').map(tx => ({
              id: tx.id,
              vendorName: tx.vendorName,
              description: tx.description,
              amount: tx.amount,
              dueDate: tx.dueDate,
              category: tx.category,
            })) || []}
            incomeItems={incomeItems.map(i => ({
              id: i.id,
              description: i.description,
              source: i.source || i.description,
              amount: i.amount,
              paymentDate: i.paymentDate,
              status: i.status,
            }))}
            onMatch={handleManualMatchConfirm}
          />
          
          {/* Limit Enforcement Modal */}
          <LimitEnforcementModal
            open={showLimitModal.open}
            onClose={() => setShowLimitModal({ ...showLimitModal, open: false })}
            limitType={showLimitModal.type}
            currentUsage={
              showLimitModal.type === 'bank_connection' ? currentUsage.bankConnections :
              showLimitModal.type === 'amazon_connection' ? currentUsage.amazonConnections :
              currentUsage.teamMembers
            }
            limit={
              showLimitModal.type === 'bank_connection' ? planLimits.bankConnections :
              showLimitModal.type === 'amazon_connection' ? planLimits.amazonConnections :
              planLimits.teamMembers
            }
          />
          
          {/* Subtle gradient orbs */}
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tl from-accent/5 to-transparent rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;