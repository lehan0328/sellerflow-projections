import React, { useState, useMemo, useEffect } from "react";
import { addDays, isToday, isBefore, startOfDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
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
import ScenarioPlanner from "@/pages/ScenarioPlanner";
import Analytics from "@/pages/Analytics";
import DocumentStorage from "@/pages/DocumentStorage";
import Support from "@/pages/Support";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCustomers } from "@/hooks/useCustomers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreditCards } from "@/hooks/useCreditCards";

import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
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

// ========== Type Definitions ==========

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  source?: string;
  date: Date;
  // Whether this event should affect cash balance calculations
  affectsBalance?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [financialsView, setFinancialsView] = useState<"bank-accounts" | "credit-cards">("bank-accounts");
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [showEditIncomeForm, setShowEditIncomeForm] = useState(false);
  const { toast } = useToast();
  const [vendorTxRefresh, setVendorTxRefresh] = useState(0);
  const [includeForecastPayouts, setIncludeForecastPayouts] = useState(false);
  const [matchReviewDialog, setMatchReviewDialog] = useState<{
    open: boolean;
    match: TransactionMatch | null;
  }>({ open: false, match: null });
  
  // Use database hooks
  const { vendors, addVendor, updateVendor, deleteVendor, deleteAllVendors, cleanupOrphanedVendors, refetch: refetchVendors } = useVendors();
  const { transactions, addTransaction, deleteTransaction, refetch: refetchTransactions } = useTransactions();
  const { totalBalance: bankAccountBalance, accounts } = useBankAccounts();
  const { creditCards } = useCreditCards();
  const { recurringExpenses, createRecurringExpense } = useRecurringExpenses();
  const { data: safeSpendingData, updateReserveAmount, refetch: refetchSafeSpending } = useSafeSpending();
  const { amazonPayouts } = useAmazonPayouts();
  
  console.log('Dashboard - bankAccountBalance:', bankAccountBalance, 'accounts connected:', accounts?.length || 0);
  const { totalCash: userSettingsCash, updateTotalCash, setStartingBalance } = useUserSettings();

  // Example bank transactions for matching - with realistic data
  const exampleBankTransactions: BankTransaction[] = [
    {
      id: 'bank-tx-1',
      accountId: 'demo-checking-001',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: new Date(),
      description: 'ACH DEBIT AMAZON.COM',
      merchantName: 'Amazon',
      amount: -2450.00,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    },
    {
      id: 'bank-tx-2',
      accountId: 'demo-checking-001',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: addDays(new Date(), -1),
      description: 'WALMART SUPERCENTER #1234',
      merchantName: 'Walmart',
      amount: -850.50,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    },
    {
      id: 'bank-tx-3',
      accountId: 'demo-checking-001',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: addDays(new Date(), -2),
      description: 'OFFICE DEPOT #5678',
      merchantName: 'Office Depot',
      amount: -320.75,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    },
    {
      id: 'bank-tx-4',
      accountId: 'demo-checking-001',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: new Date(),
      description: 'ACH CREDIT CUSTOMER PAYMENT',
      merchantName: 'Customer Payment',
      amount: 5000.00,
      type: 'credit',
      category: 'Income',
      status: 'posted'
    },
    {
      id: 'bank-tx-5',
      accountId: 'demo-checking-001',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: addDays(new Date(), -3),
      description: 'STAPLES STORES #9012',
      merchantName: 'Staples',
      amount: -175.25,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    },
    {
      id: 'bank-tx-6',
      accountId: 'demo-checking-001',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: addDays(new Date(), -1),
      description: 'WIRE TRANSFER CLIENT ABC',
      merchantName: 'Client Payment',
      amount: 3500.00,
      type: 'credit',
      category: 'Income',
      status: 'posted'
    }
  ];
  
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

  const { customers, addCustomer, deleteAllCustomers } = useCustomers();
  
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
  const bankTransactions = exampleBankTransactions;
  const { matches, getMatchesForIncome } = useTransactionMatching(bankTransactions, vendors, incomeItems);
  
  // Calculate unmatched transactions that need attention
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
    
    const amount = typeof orderData.amount === 'string' ? 
      parseFloat(orderData.amount) : orderData.amount;
    
    const dueDate = orderData.dueDate || new Date();
    const today = startOfDay(new Date());
    const dueDateStartOfDay = startOfDay(dueDate);
    
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

    // Create transaction for this PO (individual record)
    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: orderData.poName || `PO - ${orderData.vendor}`,
      vendorId: vendorId,
      transactionDate: orderData.poDate || new Date(),
      dueDate: dueDate,
      status: dueDateStartOfDay <= today ? 'completed' : 'pending',
      creditCardId: orderData.paymentMethod === 'credit-card' ? orderData.selectedCreditCard : null
    });

    console.info("Transaction created, refreshing data");
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
      // Exclude completed transactions
      if (tx.type !== 'purchase_order' || !tx.vendorId) return false;
      if (tx.status === 'completed') return false;
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
      return {
        id: `vendor-tx-${tx.id}`,
        type: 'outflow' as const,
        amount: tx.amount,
        description: tx.description || `${vendor?.name || 'Vendor'} - Payment Due`,
        vendor: vendor?.name,
        date: tx.dueDate || tx.transactionDate
      };
    });

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

  // Convert Amazon payouts to calendar events (filter forecasted based on toggle)
  const amazonPayoutEvents: CashFlowEvent[] = amazonPayouts
    .filter(payout => includeForecastPayouts || (payout.status as string) !== 'forecasted')
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
  const displayCash = accounts.length > 0 ? bankAccountBalance : userSettingsCash + transactionTotal;

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

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <>
            <OverviewStats 
              totalCash={displayCash} 
              events={allCalendarEvents}
              onUpdateCashBalance={handleUpdateCashBalance}
              pendingIncomeToday={pendingIncomeToday}
            />
            
            {/* Transaction Match Notification */}
            <TransactionMatchNotification unmatchedCount={unmatchedTransactionsCount} />
            
            
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
                  bankAccountBalance={bankAccountBalance}
                  vendors={vendors}
                  onVendorClick={handleEditVendorOrder}
                  onIncomeClick={handleEditIncome}
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
                  reserveAmount={safeSpendingData?.reserve_amount || 0}
                  projectedLowestBalance={safeSpendingData?.calculation?.lowest_projected_balance || 0}
                  lowestBalanceDate={safeSpendingData?.calculation?.lowest_balance_date || ""}
                  safeSpendingAvailableDate={safeSpendingData?.calculation?.safe_spending_available_date}
                  nextBuyingOpportunityBalance={safeSpendingData?.calculation?.next_buying_opportunity_balance}
                  nextBuyingOpportunityDate={safeSpendingData?.calculation?.next_buying_opportunity_date}
                  nextBuyingOpportunityAvailableDate={safeSpendingData?.calculation?.next_buying_opportunity_available_date}
                  allBuyingOpportunities={safeSpendingData?.calculation?.all_buying_opportunities || []}
                  onUpdateReserveAmount={updateReserveAmount}
                  includeForecastPayouts={includeForecastPayouts}
                  onToggleForecastPayouts={setIncludeForecastPayouts}
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
                          } else if (match.type === 'vendor' && match.matchedVendor) {
                            await updateVendor(match.matchedVendor.id, {
                              totalOwed: Math.max(0, match.matchedVendor.totalOwed - Math.abs(match.bankTransaction.amount))
                            });
                            await addTransaction({
                              type: 'vendor_payment',
                              amount: Math.abs(match.bankTransaction.amount),
                              description: `Auto-matched: Payment to ${match.matchedVendor.name}`,
                              vendorId: match.matchedVendor.id,
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
      
      case "transactions":
        return (
          <TransactionsView
            bankTransactions={exampleBankTransactions}
            onVendorUpdate={() => {
              refetchVendors();
              refetchTransactions();
              setVendorTxRefresh((v) => v + 1);
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
                      ? "bg-background shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bank Accounts
                </button>
                <button
                  onClick={() => setFinancialsView("credit-cards")}
                  className={`px-4 py-2 rounded-md transition-all ${
                    financialsView === "credit-cards"
                      ? "bg-background shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Credit Cards
                </button>
              </div>
            </div>
            {financialsView === "bank-accounts" ? <BankAccounts /> : <CreditCards />}
          </div>
        );
      
      case "recurring":
        return <RecurringExpensesOverview />;
      
      case "amazon":
        return <AmazonPayouts />;
      
      case "scenario-planning":
        return <ScenarioPlanner />;
      
      case "analytics":
        return <Analytics />;
      
      case "document-storage":
        return <DocumentStorage />;
      
      case "support":
        return <Support />;
      
      case "referrals":
        return <ReferralDashboardContent />;
      
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onFlexReportClick={() => navigate('/flex-report')}
        />
        
        <div className="flex-1 overflow-auto relative">
          {/* Subtle gradient orbs */}
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tl from-accent/5 to-transparent rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
          
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
              onDeleteAllCustomers={deleteAllCustomers}
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
              onDeleteAllCustomers={deleteAllCustomers}
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
              onDeleteAllCustomers={deleteAllCustomers}
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
              } else if (match.type === 'vendor' && match.matchedVendor) {
                // Update vendor to reduce amount owed
                await updateVendor(match.matchedVendor.id, {
                  totalOwed: Math.max(0, match.matchedVendor.totalOwed - Math.abs(match.bankTransaction.amount))
                });
                
                // Create completed transaction
                await addTransaction({
                  type: 'vendor_payment',
                  amount: Math.abs(match.bankTransaction.amount),
                  description: `Matched: Payment to ${match.matchedVendor.name}`,
                  vendorId: match.matchedVendor.id,
                  transactionDate: new Date(),
                  status: 'completed'
                });
                
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
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;