import React, { useState, useMemo, useEffect } from "react";
import { addDays, isToday, isBefore, startOfDay, format } from "date-fns";
import { DashboardHeader } from "@/components/cash-flow/dashboard-header";
import { FloatingMenu } from "@/components/cash-flow/floating-menu";
import { OverviewStats } from "@/components/cash-flow/overview-stats";
import { CashFlowCalendar } from "@/components/cash-flow/cash-flow-calendar";
import { CashFlowInsights } from "@/components/cash-flow/cash-flow-insights";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { BankAccounts } from "@/components/cash-flow/bank-accounts";
import { CreditCards, getCreditCardDueDates } from "@/components/cash-flow/credit-cards";
import { AmazonPayouts } from "@/components/cash-flow/amazon-payouts";
import { PurchaseOrderForm } from "@/components/cash-flow/purchase-order-form";
import { VendorOrderEditModal } from "@/components/cash-flow/vendor-order-edit-modal";
import { IncomeOverview } from "@/components/cash-flow/income-overview";
import { IncomeForm } from "@/components/cash-flow/income-form";
import { useIncome } from "@/hooks/useIncome";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCustomers } from "@/hooks/useCustomers";
import { useToast } from "@/hooks/use-toast";

import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { BankTransaction } from "@/components/cash-flow/bank-transaction-log";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";

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
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showRecurringIncomeForm, setShowRecurringIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [showEditIncomeForm, setShowEditIncomeForm] = useState(false);
  const { toast } = useToast();
  
  // Use database hooks
  const { vendors, addVendor, updateVendor, deleteVendor, deleteAllVendors, refetch: refetchVendors } = useVendors();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { totalBalance: bankAccountBalance, accounts } = useBankAccounts();
  const { totalCash: userSettingsCash, updateTotalCash, setStartingBalance } = useUserSettings();

  // Example bank transactions for matching
  const exampleBankTransactions: BankTransaction[] = [
    {
      id: '1',
      accountId: 'example-acc-1',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: new Date(),
      description: 'ABC SUPPLIES INC',
      merchantName: 'ABC Supplies',
      amount: -1250,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    },
    {
      id: '2',
      accountId: 'example-acc-1',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: new Date(),
      description: 'BILO DISTRIBUTORS',
      merchantName: 'Bilo Distributors',
      amount: -850,
      type: 'debit',
      category: 'Business',
      status: 'posted'
    },
    {
      id: '3',
      accountId: 'example-acc-1',
      accountName: 'Business Checking',
      institutionName: 'Chase Bank',
      date: new Date(),
      description: 'DEPOSIT - ACME CORP',
      merchantName: 'Acme Corp',
      amount: 5000,
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
  const { getMatchesForIncome } = useTransactionMatching(bankTransactions, vendors, incomeItems);

  // Calculate pending income due today that's not matched
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  const pendingIncomeToday = incomeItems
    .filter(income => {
      const paymentDate = new Date(income.paymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      const isToday = paymentDate.getTime() === todayDate.getTime();
      const isPending = income.status === 'pending';
      const isNotMatched = getMatchesForIncome(income.id).length === 0;
      return isToday && isPending && isNotMatched;
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
    
    // Only deduct cash if due date is today or in the past (for display purposes only)
    // Note: In a real Plaid integration, this would schedule/execute the payment
    if (dueDateStartOfDay <= today) {
      console.info("Due date is today or past - payment would be processed:", amount);
      console.info("Current bank balance:", bankAccountBalance);
    } else {
      console.info("Due date is in the future - payment scheduled for:", format(dueDate, "PPP"));
    }

    // Each purchase order creates a separate vendor record
    // This allows tracking individual POs separately, even from the same vendor company
    let vendor;
    {
      // Create new vendor record for this PO
      const paymentSchedule = orderData.paymentSchedule || [];
      let nextPaymentDate = orderData.paymentType === 'due-upon-order' ? orderData.poDate : orderData.dueDate;
      let nextPaymentAmount = amount;
      
      // For preorder, use first payment from schedule
      if (orderData.paymentType === 'preorder' && paymentSchedule.length > 0) {
        nextPaymentDate = paymentSchedule[0].dueDate;
        nextPaymentAmount = parseFloat(paymentSchedule[0].amount);
      }

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

      vendor = await addVendor({
        name: orderData.vendor,
        totalOwed: amount,
        nextPaymentDate: nextPaymentDate || orderData.poDate || new Date(),
        nextPaymentAmount: nextPaymentAmount,
        status: 'upcoming',
        category: orderData.category || '',
        paymentType: dbPaymentType,
        netTermsDays: orderData.netTermsDays,
        poName: orderData.poName,
        description: orderData.description,
        notes: orderData.notes,
        paymentSchedule: paymentSchedule,
        source: 'management'
      });
    }

    await addTransaction({
      type: 'purchase_order',
      amount: amount,
      description: `${orderData.poName} - ${orderData.vendor}`,
      vendorId: vendor?.id,
      transactionDate: new Date(),
      dueDate: orderData.dueDate,
      status: dueDateStartOfDay <= today ? 'completed' : 'pending'
    });

    // Don't create cash flow events since vendors automatically generate calendar events
    // This prevents duplication in the calendar

    // Refresh vendors to show updated data and update calendar
    await refetchVendors();
    
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
      status: paymentDateStartOfDay <= today ? 'received' as const : 'pending' as const,
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
    
    // Note: In a real Plaid integration, this would add funds to connected account

    // Add to database - check if it succeeds
    const newIncome = await addIncome({
      description: incomeData.description || 'Income',
      amount: amount,
      paymentDate: paymentDate,
      source: incomeData.customer || incomeData.source || 'Manual Entry',
      status: paymentDateStartOfDay <= today ? 'received' as const : 'pending' as const,
      category: incomeData.category || '',
      isRecurring: incomeData.isRecurring || false,
      recurringFrequency: incomeData.recurringFrequency,
      notes: incomeData.notes,
      customerId: incomeData.customerId
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

    // Remove income item from income overview now that it's processed
    await deleteIncome(income.id);
  };

  const handleEditVendorOrder = (vendor: Vendor) => {
    setEditingVendor(vendor);
  };

  const handleSaveVendorOrder = async (updatedVendor: Vendor) => {
    const originalVendor = vendors.find(v => v.id === updatedVendor.id);
    
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
    
    setEditingVendor(null);
  };

  const handleDeleteVendorOrder = async (vendor: Vendor) => {
    // Delete ONLY the PO transaction and adjust the vendor balance; never delete the vendor
    const newTotalOwed = Math.max(0, (vendor.totalOwed || 0) - (vendor.nextPaymentAmount || 0));

    // Try to find the exact matching transaction for this PO
    const targetTx = transactions.find(t =>
      t.type === 'purchase_order' &&
      t.vendorId === vendor.id &&
      Math.abs(t.amount - vendor.nextPaymentAmount) < 0.01 &&
      (t.dueDate && vendor.nextPaymentDate
        ? startOfDay(t.dueDate).getTime() === startOfDay(vendor.nextPaymentDate).getTime()
        : true)
    ) || transactions.find(t => t.vendorId === vendor.id && t.type === 'purchase_order');

    if (targetTx) {
      await deleteTransaction(targetTx.id);
    }

    // Recompute next payment info based on remaining schedule
    let nextPaymentDate = vendor.nextPaymentDate;
    let nextPaymentAmount = 0;
    let updatedPaymentSchedule = vendor.paymentSchedule || [];

    if (updatedPaymentSchedule.length > 1) {
      updatedPaymentSchedule = updatedPaymentSchedule.slice(1);
      nextPaymentDate = new Date(updatedPaymentSchedule[0].dueDate);
      nextPaymentAmount = parseFloat(updatedPaymentSchedule[0].amount) || 0;
    }

    await updateVendor(vendor.id, {
      totalOwed: newTotalOwed,
      nextPaymentDate,
      nextPaymentAmount,
      paymentSchedule: updatedPaymentSchedule,
      status: newTotalOwed > 0 ? vendor.status : 'upcoming'
    });

    toast({
      title: 'Purchase order deleted',
      description: 'The vendor record was kept and the balance was updated.',
    });

    // Remove any cash flow events associated with this vendor by name or PO name
    setCashFlowEvents(prev => prev.filter(event => 
      !(event.vendor === vendor.name || 
        event.description?.includes(vendor.name) ||
        (vendor.poName && event.description?.includes(vendor.poName)))
    ));

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

  // Convert vendor due dates to calendar events
  const vendorEvents: CashFlowEvent[] = vendors
    .filter(vendor => vendor.totalOwed > 0 && vendor.nextPaymentDate)
    .map(vendor => ({
      id: `vendor-${vendor.id}`,
      type: 'outflow' as const,
      amount: vendor.nextPaymentAmount,
      description: `${vendor.name} - ${vendor.poName || 'Payment Due'}`,
      vendor: vendor.name,
      date: vendor.nextPaymentDate
    }));

  // Convert income items to calendar events
  const incomeEvents: CashFlowEvent[] = incomeItems
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

  // Get credit card due date events only if user has real data (vendors or transactions)
  const hasRealData = vendors.length > 0 || transactions.length > 0;
  const creditCardEvents = hasRealData ? getCreditCardDueDates() : [];

  // Combine all events for calendar - only include real user data
  const allCalendarEvents = [...calendarEvents, ...vendorEvents, ...incomeEvents, ...creditCardEvents];

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

  const upcomingExpenses = transactions
    .filter(t => {
      const txDate = startOfDay(t.transactionDate);
      const sevenDaysOut = addDays(today, 7);
      return txDate > today && txDate <= sevenDaysOut &&
             (t.type === 'purchase_order' || t.type === 'vendor_payment') &&
             t.status === 'pending';
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <DashboardHeader />
      
      <div className="p-6 space-y-6">
        <OverviewStats 
          totalCash={displayCash} 
          events={allCalendarEvents}
          onUpdateCashBalance={handleUpdateCashBalance}
          pendingIncomeToday={pendingIncomeToday}
        />
        
        {/* Row 1: Cash Flow Calendar and AI Insights (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[700px]">
          <div className="lg:col-span-2 h-full">
            <CashFlowCalendar 
              events={allCalendarEvents} 
              totalCash={displayCash}
              onEditTransaction={handleEditTransaction}
              todayInflow={todayInflow}
              todayOutflow={todayOutflow}
              upcomingExpenses={upcomingExpenses}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <CashFlowInsights
              currentBalance={displayCash}
              dailyInflow={todayInflow}
              dailyOutflow={todayOutflow}
              upcomingExpenses={upcomingExpenses}
              events={allCalendarEvents}
            />
          </div>
        </div>

        {/* Row 2: Vendors Overview and Income Overview (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorsOverview 
            vendors={activeVendors}
            bankTransactions={exampleBankTransactions}
            onVendorUpdate={() => {
              refetchVendors();
            }}
            onDeleteVendor={async (vendorId) => {
              // Find the vendor to get full details
              const vendor = vendors.find(v => v.id === vendorId);
              if (vendor) {
                await handleDeleteVendorOrder(vendor);
              }
            }}
            onEditOrder={(vendor) => {
              console.log('Edit order for vendor:', vendor);
            }}
            onMatchTransaction={async (vendor) => {
              // Create a completed transaction record when matching
              await addTransaction({
                type: 'vendor_payment',
                amount: vendor.totalOwed || 0,
                description: `Matched: ${vendor.name} - ${vendor.poName || 'Payment'}`,
                vendorId: vendor.id,
                transactionDate: new Date(),
                status: 'completed'
              });
            }}
          />
          <IncomeOverview
            incomeItems={incomeItems}
            bankTransactions={exampleBankTransactions}
            onCollectToday={handleCollectIncome}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncome}
            onMatchTransaction={async (income) => {
              // Create a completed transaction record when matching
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
        </div>

        {/* Row 3: Bank Accounts and Credit Cards (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankAccounts />
          <CreditCards />
        </div>

        {/* Row 5: Amazon Payouts (Full Width) */}
        {(vendors.length > 0 || transactions.length > 0) && <AmazonPayouts />}
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
    </div>
  );
};

export default Dashboard;