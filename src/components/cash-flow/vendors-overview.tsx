import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Calendar, DollarSign, AlertTriangle, Edit, CreditCard, Search, ArrowUpDown, Filter, Trash2, Link2, ExternalLink, Banknote, Landmark, Package, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useVendorTransactions, type VendorTransaction } from "@/hooks/useVendorTransactions";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useCreditCards } from "@/hooks/useCreditCards";
import { VendorOrderDetailModal } from "./vendor-order-detail-modal";
import { TransactionEditModal } from "./transaction-edit-modal";
import { PartialPaymentModal } from "./partial-payment-modal";
import { PartialPaymentDeleteDialog } from "./partial-payment-delete-dialog";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";
import { BankTransaction } from "./bank-transaction-log";
import { toast } from "sonner";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateSimilarity } from "@/lib/similarityUtils";


interface VendorsOverviewProps {
  bankTransactions?: BankTransaction[];
  onVendorUpdate?: () => void;
  refreshKey?: number;
}

export const VendorsOverview = ({
  bankTransactions = [],
  onVendorUpdate,
  refreshKey
}: VendorsOverviewProps) => {
  const navigate = useNavigate();
  const {
    transactions,
    markAsPaid,
    markAsPartiallyPaid,
    updateRemarks,
    deleteTransaction,
    refetch
  } = useVendorTransactions();
  const {
    vendors
  } = useVendors();
  const { creditCards } = useCreditCards();
  const {
    getMatchesForVendorTransaction
  } = useTransactionMatching(bankTransactions, transactions, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [lineItemSearch, setLineItemSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'vendorName' | 'amount' | 'dueDate'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<VendorTransaction | null>(null);
  const [dateRange, setDateRange] = useState<string>("all");
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();
  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isToDatePickerOpen, setIsToDatePickerOpen] = useState(false);
  const [partialPaymentTx, setPartialPaymentTx] = useState<VendorTransaction | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [lineItemsByTransaction, setLineItemsByTransaction] = useState<Record<string, any[]>>({});
  const [matchingPOsByTransaction, setMatchingPOsByTransaction] = useState<Record<string, any[]>>({});
  const [deleteDialogTx, setDeleteDialogTx] = useState<VendorTransaction | null>(null);
  const [deleteDialogAmounts, setDeleteDialogAmounts] = useState<{ paidAmount: number; totalAmount: number }>({ paidAmount: 0, totalAmount: 0 });

  const toggleRow = (transactionId: string) => {
    setExpandedRows(prev => ({ ...prev, [transactionId]: !prev[transactionId] }));
    
    // Fetch line items if not already loaded
    if (!lineItemsByTransaction[transactionId]) {
      fetchLineItems(transactionId);
    }
  };

  // Auto-fetch line items for all transactions when line item search is active
  useEffect(() => {
    if (lineItemSearch && transactions.length > 0) {
      transactions.forEach(tx => {
        if (!lineItemsByTransaction[tx.id]) {
          fetchLineItems(tx.id);
        }
      });
    }
  }, [lineItemSearch, transactions]);

  const fetchLineItems = async (transactionId: string) => {
    try {
      // @ts-ignore - Suppress excessive type depth error from Supabase generated types
      const result = await supabase
        .from('purchase_order_line_items')
        .select('id, transaction_id, product_name, sku, quantity, unit_price, total_price, created_at')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

      if (result.error) throw result.error;
      
      const lineItems: any[] = result.data || [];
      setLineItemsByTransaction(prev => ({
        ...prev,
        [transactionId]: lineItems
      }));

      // Find matching purchase orders based on line item similarity
      if (lineItems.length > 0) {
        await findMatchingPurchaseOrders(transactionId, lineItems);
      }
    } catch (error) {
      console.error('Error fetching line items:', error);
    }
  };

  const findMatchingPurchaseOrders = async (currentTransactionId: string, currentLineItems: any[]) => {
    try {
      // Get all other transactions with line items
      const { data: allTransactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          vendor_id,
          description,
          amount,
          due_date,
          status,
          vendors(name)
        `)
        .eq('type', 'purchase_order')
        .neq('id', currentTransactionId)
        .order('due_date', { ascending: false });

      if (error) throw error;

      const matchingPOs: Array<{
        id: string;
        vendor_name: string;
        po_number: string;
        amount: number;
        due_date: string;
        status: string;
        matching_items: Array<{
          description: string;
          similarity: number;
        }>;
      }> = [];

      // Check each transaction for matching line items
      for (const transaction of allTransactions || []) {
        const { data: otherLineItems } = await supabase
          .from('purchase_order_line_items')
          .select('*')
          .eq('vendor_id', transaction.vendor_id); // Match by vendor instead

        if (!otherLineItems || otherLineItems.length === 0) continue;

        const matchingItems: Array<{ description: string; similarity: number }> = [];

        // Compare each current line item with other transaction's line items
        currentLineItems.forEach((currentItem) => {
          otherLineItems.forEach((otherItem) => {
            const currentDesc = currentItem.product_name || '';
            const otherDesc = otherItem.product_name || '';

            if (currentDesc && otherDesc) {
              const similarity = calculateSimilarity(currentDesc, otherDesc);

              // 80% or higher = match
              if (similarity >= 80) {
                matchingItems.push({
                  description: otherDesc,
                  similarity
                });
              }
            }
          });
        });

        // If transaction has matches, add to results
        if (matchingItems.length > 0) {
          matchingPOs.push({
            id: transaction.id,
            vendor_name: (transaction as any).vendors?.name || 'Unknown',
            po_number: transaction.description || '',
            amount: transaction.amount || 0,
            due_date: transaction.due_date || '',
            status: transaction.status || '',
            matching_items: matchingItems.sort((a, b) => b.similarity - a.similarity)
          });
        }
      }

      // Sort by date (most recent first) and limit to top 3
      const topMatches = matchingPOs
        .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
        .slice(0, 3);

      setMatchingPOsByTransaction(prev => ({
        ...prev,
        [currentTransactionId]: topMatches
      }));
    } catch (error) {
      console.error('Error finding matching purchase orders:', error);
    }
  };

  // Force refresh when parent signals
  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch();
    }
  }, [refreshKey]);

  // Vendor search options for autocomplete - unique vendors only
  const vendorSearchOptions = useMemo(() => {
    const uniqueVendors = new Map();
    transactions.forEach(tx => {
      if (!uniqueVendors.has(tx.vendorName.toLowerCase())) {
        uniqueVendors.set(tx.vendorName.toLowerCase(), tx.vendorName);
      }
    });
    return Array.from(uniqueVendors.entries()).map(([value, label]) => ({
      value,
      label
    }));
  }, [transactions]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      // Hide parent transactions marked as partially_paid (they'll be shown via .1 and .2)
      // Also hide .1 transactions (the paid portion) from vendors overview
      if (tx.status === 'partially_paid' || tx.description.endsWith('.1')) {
        return false;
      }

      // If a specific vendor is selected, show only that vendor's transactions
      if (selectedVendor) {
        const matchesSelectedVendor = tx.vendorName.toLowerCase() === selectedVendor.toLowerCase();
        if (!matchesSelectedVendor) return false;
      } else if (searchTerm) {
        // General text search filter
        const matchesSearch = tx.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || tx.category?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.amount.toString().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Line item search filter
      if (lineItemSearch) {
        // We need to load line items for filtering - fetch if not loaded
        if (!lineItemsByTransaction[tx.id]) {
          // Skip this transaction for now if line items not loaded
          return false;
        }
        const lineItems = lineItemsByTransaction[tx.id] || [];
        const matchesLineItem = lineItems.some(item => 
          item.product_name?.toLowerCase().includes(lineItemSearch.toLowerCase()) ||
          item.sku?.toLowerCase().includes(lineItemSearch.toLowerCase())
        );
        if (!matchesLineItem) return false;
      }

      // Status filter - automatically exclude overdue and completed from 'all' filter
      let matchesStatus = true;
      if (statusFilter === 'all') {
        // Exclude overdue and completed/paid transactions from 'all' view
        if (tx.status === 'completed' || tx.status === 'paid') {
          matchesStatus = false;
        } else if (tx.status === 'pending' && tx.dueDate && new Date(tx.dueDate) < new Date()) {
          matchesStatus = false;
        }
      } else if (statusFilter === 'overdue') {
        matchesStatus = tx.status === 'pending' && tx.dueDate && new Date(tx.dueDate) < new Date();
      } else if (statusFilter === 'paid') {
        matchesStatus = tx.status === 'completed' || tx.status === 'paid';
      }
      if (!matchesStatus) return false;

      // Payment method filter
      if (paymentMethodFilter === 'cash' && tx.creditCardId) return false;
      if (paymentMethodFilter === 'credit' && !tx.creditCardId) return false;

      // Date range filter
      if (dateRange !== "all" && dateRange !== "custom" && tx.dueDate) {
        const now = new Date();
        const days = dateRange === "3days" ? 3 : dateRange === "7days" ? 7 : 30;
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (new Date(tx.dueDate) < startDate) return false;
      } else if (dateRange === "custom" && customFromDate && customToDate && tx.dueDate) {
        const date = new Date(tx.dueDate);
        if (date < customFromDate || date > customToDate) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      if (sortBy === 'dueDate') {
        aValue = a.dueDate ? a.dueDate.getTime() : 0;
        bValue = b.dueDate ? b.dueDate.getTime() : 0;
      } else {
        aValue = a[sortBy];
        bValue = b[sortBy];
      }
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      }
      if (typeof aValue === 'number') {
        return sortOrder === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
      }
      return 0;
    });
  }, [transactions, searchTerm, selectedVendor, statusFilter, sortBy, sortOrder, dateRange, customFromDate, customToDate, paymentMethodFilter, lineItemSearch]);

  const handleVendorSearch = (value: string) => {
    // Check if the value matches one of our vendor options exactly
    const matchingOption = vendorSearchOptions.find(option => option.value === value);
    if (matchingOption) {
      // User selected a specific vendor from dropdown
      setSelectedVendor(value);
      setSearchTerm('');
    } else {
      // User is typing/searching - clear selected vendor and use as search term
      setSelectedVendor('');
      setSearchTerm(value);
    }
  };

  const handleDeleteTransaction = async (transaction: VendorTransaction) => {
    // Check if this is a partial payment remaining balance
    if (transaction.description.endsWith('.2')) {
      // Fetch the amounts before showing the dialog
      const amounts = await getPartialPaymentAmounts(transaction);
      setDeleteDialogAmounts(amounts);
      setDeleteDialogTx(transaction);
    } else {
      // Regular transaction - delete directly
      try {
        await deleteTransaction(transaction.id, false);
        toast.success("Transaction deleted successfully");
        onVendorUpdate?.();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error("Failed to delete transaction");
      }
    }
  };

  const handleDeleteRemainingOnly = async () => {
    if (!deleteDialogTx) return;
    try {
      await deleteTransaction(deleteDialogTx.id, false);
      toast.success("Remaining balance deleted successfully");
      setDeleteDialogTx(null);
      onVendorUpdate?.();
    } catch (error) {
      console.error('Error deleting remaining balance:', error);
      toast.error("Failed to delete remaining balance");
    }
  };

  const handleReverseEntirePayment = async () => {
    if (!deleteDialogTx) return;
    try {
      await deleteTransaction(deleteDialogTx.id, true);
      toast.success("Partial payment reversed successfully");
      setDeleteDialogTx(null);
      onVendorUpdate?.();
    } catch (error) {
      console.error('Error reversing payment:', error);
      toast.error("Failed to reverse payment");
    }
  };

  const getPartialPaymentAmounts = async (transaction: VendorTransaction) => {
    if (!transaction.description.endsWith('.2')) {
      return { paidAmount: 0, totalAmount: transaction.amount };
    }

    const baseDescription = transaction.description.replace('.2', '');
    const { data: paidTx } = await supabase
      .from('transactions')
      .select('amount')
      .eq('description', `${baseDescription}.1`)
      .single();

    const paidAmount = paidTx?.amount || 0;
    const totalAmount = paidAmount + transaction.amount;

    return { paidAmount, totalAmount };
  };

  const handlePayToday = async (transactionId: string) => {
    try {
      await markAsPaid(transactionId);
      onVendorUpdate?.();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const handlePartialPayment = async (data: {
    transactionId: string;
    amountPaid: number;
    remainingBalance: number;
    newDueDate: Date;
  }) => {
    try {
      await markAsPartiallyPaid(data.transactionId, data.amountPaid, data.remainingBalance, data.newDueDate);
      onVendorUpdate?.();
    } catch (error) {
      console.error('Error processing partial payment:', error);
    }
  };

  const getStatusColor = (tx: VendorTransaction) => {
    if (!tx.dueDate) return 'default';
    if (tx.status === 'completed' || tx.status === 'paid') {
      return 'default'; // Paid - neutral color
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(tx.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (daysDiff < 0) {
      return 'destructive'; // overdue - red
    } else if (daysDiff === 0) {
      return 'secondary'; // due today - yellow
    } else if (daysDiff <= 7) {
      return 'secondary'; // due within a week - yellow
    }
    return 'default'; // upcoming - neutral
  };

  const getStatusIcon = (tx: VendorTransaction) => {
    if (!tx.dueDate) return <Calendar className="h-4 w-4" />;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(tx.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (daysDiff < 0) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Calendar className="h-4 w-4" />;
  };

  const getStatusText = (tx: VendorTransaction) => {
    if (!tx.dueDate) return 'No due date';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(tx.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (tx.status === 'completed' || tx.status === 'paid') {
      return 'Paid';
    }
    if (daysDiff > 0) {
      return `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'}`;
    } else if (daysDiff === 0) {
      return 'Due Today';
    } else {
      const overdueDays = Math.abs(daysDiff);
      return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
    }
  };

  const totalOwed = filteredAndSortedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalOwedCash = filteredAndSortedTransactions
    .filter(tx => !tx.creditCardId)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalOwedCredit = filteredAndSortedTransactions
    .filter(tx => tx.creditCardId)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const thisMonthTransactions = filteredAndSortedTransactions.filter(tx => {
    if (!tx.dueDate || tx.status === 'completed' || tx.status === 'paid') return false;
    const today = new Date();
    const dueDate = new Date(tx.dueDate);
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
  });
  const thisMonthAmount = thisMonthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const thisMonthCash = thisMonthTransactions.filter(tx => !tx.creditCardId).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const thisMonthCredit = thisMonthTransactions.filter(tx => tx.creditCardId).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const pendingTransactions = filteredAndSortedTransactions.filter(tx => 
    tx.status === 'pending' || (tx.status !== 'completed' && tx.status !== 'paid')
  );
  const pendingCount = pendingTransactions.length;
  const pendingCash = pendingTransactions.filter(tx => !tx.creditCardId).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const pendingCredit = pendingTransactions.filter(tx => tx.creditCardId).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  // Calculate how many pending transactions are due this month
  const pendingThisMonth = pendingTransactions.filter(tx => {
    if (!tx.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(tx.dueDate);
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payables</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalOwed)}</div>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Landmark className="h-3 w-3" />
                  Bank/Cash:
                </span>
                <span className="font-medium">{formatCurrency(totalOwedCash)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  Credit Card:
                </span>
                <span className="font-medium">{formatCurrency(totalOwedCredit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                This Month:
              </span>
              <span className="font-medium">{pendingThisMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(thisMonthAmount)}</div>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Landmark className="h-3 w-3" />
                  Bank/Cash:
                </span>
                <span className="font-medium">{formatCurrency(thisMonthCash)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  Credit Card:
                </span>
                <span className="font-medium">{formatCurrency(thisMonthCredit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Vendor Details Card */}
      <Card className="shadow-card h-[700px] flex flex-col border-t-4 border-t-primary">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Vendors Overview</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Owed:</span>
              <span className="font-semibold">{formatCurrency(totalOwed)}</span>
            </div>
            {thisMonthAmount > 0 && <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-primary font-semibold">
                  {formatCurrency(thisMonthAmount)} This Month
                </span>
              </div>}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => navigate("/transactions?tab=vendors")} className="flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>Archived Transactions</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View archived transactions. All archived transactions are automatically erased after 1 year.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1 max-w-sm flex items-center space-x-2">
            <Combobox options={vendorSearchOptions} value={selectedVendor || searchTerm} onValueChange={handleVendorSearch} placeholder="Search vendors..." emptyText="No vendors found." className="flex-1" />
            {(selectedVendor || searchTerm) && <Button variant="outline" size="sm" onClick={() => {
            setSelectedVendor('');
            setSearchTerm('');
          }} className="px-3">
                Clear
              </Button>}
          </div>
          
          <div className="flex-1 max-w-sm flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search line items..."
              value={lineItemSearch}
              onChange={(e) => setLineItemSearch(e.target.value)}
              className="flex-1"
            />
            {lineItemSearch && (
              <Button variant="outline" size="sm" onClick={() => setLineItemSearch('')} className="px-3">
                Clear
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <Select value={paymentMethodFilter} onValueChange={(value: any) => setPaymentMethodFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cash">Cash Only</SelectItem>
                <SelectItem value="credit">Credit Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="3days">3 Days</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && <>
              <Popover open={isFromDatePickerOpen} onOpenChange={setIsFromDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customFromDate && "text-muted-foreground")}>
                    {customFromDate ? format(customFromDate, "MMM dd") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customFromDate} onSelect={(date) => {
                    setCustomFromDate(date);
                    setIsFromDatePickerOpen(false);
                  }} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover open={isToDatePickerOpen} onOpenChange={setIsToDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customToDate && "text-muted-foreground")}>
                    {customToDate ? format(customToDate, "MMM dd") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customToDate} onSelect={(date) => {
                    setCustomToDate(date);
                    setIsToDatePickerOpen(false);
                  }} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>}

          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="totalOwed">Total Owed</SelectItem>
                <SelectItem value="nextPaymentAmount">Next Payment</SelectItem>
                <SelectItem value="nextPaymentDate">Due Date</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>PO# / Ref#</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.length === 0 ? <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {selectedVendor ? `No purchase orders found for ${vendorSearchOptions.find(v => v.value === selectedVendor)?.label || selectedVendor}.` : searchTerm ? 'No transactions found matching your search.' : 'No vendor purchase orders.'}
                  </TableCell>
                </TableRow> : filteredAndSortedTransactions.map(tx => <React.Fragment key={tx.id}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium">{tx.vendorName}</TableCell>
                    <TableCell>{tx.description || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "p-2 rounded-full",
                                tx.creditCardId ? "bg-blue-100 dark:bg-blue-950" : "bg-green-100 dark:bg-green-950"
                              )}>
                                {tx.creditCardId ? (
                                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Landmark className="h-4 w-4 text-green-600 dark:text-green-400" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {tx.creditCardId ? (
                                <p>
                                  {creditCards.find(card => card.id === tx.creditCardId)?.account_name || 'Credit card purchase'}
                                </p>
                              ) : (
                                <p>Cash purchase</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="font-semibold">
                          {formatCurrency(tx.amount || 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.dueDate ? new Date(tx.dueDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(tx)} className="text-xs">
                          {getStatusIcon(tx)}
                          <span className="ml-1">{getStatusText(tx)}</span>
                        </Badge>
                        {getMatchesForVendorTransaction(tx.id).length > 0 && <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  <Link2 className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getMatchesForVendorTransaction(tx.id).length} potential bank transaction match(es)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={tx.remarks || 'Ordered'} onValueChange={value => updateRemarks(tx.id, value)}>
                        <SelectTrigger className="h-8 text-xs max-w-[130px] bg-background border border-border">
                          <SelectValue placeholder="Ordered" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[100]">
                          <SelectItem value="Ordered">Ordered</SelectItem>
                          <SelectItem value="Shipped">Shipped</SelectItem>
                          <SelectItem value="Delayed">Delayed</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                          <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                          <SelectItem value="Pending Due">Pending Due</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toggleRow(tx.id)}
                              >
                                {expandedRows[tx.id] ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{expandedRows[tx.id] ? 'Hide' : 'View'} line items</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingTransaction(tx)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit transaction</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {tx.status !== 'completed' && tx.status !== 'paid' && tx.dueDate && <TooltipProvider>
                            <Tooltip>
                              <AlertDialog open={paymentDialogOpen === tx.id} onOpenChange={open => setPaymentDialogOpen(open ? tx.id : null)}>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                                      <CreditCard className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark as paid</p>
                                </TooltipContent>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will mark the payment as fully completed. Continue?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <Button variant="outline" onClick={() => {
                              setPaymentDialogOpen(null);
                              setPartialPaymentTx(tx);
                            }}>
                                      Mark as Partially Paid
                                    </Button>
                                    <AlertDialogAction onClick={() => handlePayToday(tx.id)}>
                                      Mark as Fully Paid
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </Tooltip>
                          </TooltipProvider>}
                        <TooltipProvider>
                          <Tooltip>
                            <AlertDialog>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete transaction</p>
                              </TooltipContent>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this purchase order from {tx.vendorName}?
                                    <br /><br />
                                    <strong className="text-destructive">This action is permanent and cannot be recovered.</strong> The transaction will be completely removed from your records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTransaction(tx)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete Permanently
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded row for line items */}
                  {expandedRows[tx.id] && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                            <Package className="h-4 w-4" />
                            <span>Line Items</span>
                          </div>
                          {lineItemsByTransaction[tx.id]?.length > 0 ? (
                            <div className="grid gap-2">
                              {lineItemsByTransaction[tx.id].map((item: any, idx: number) => (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-background rounded-md border"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{item.product_name}</div>
                                    {item.sku && (
                                      <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                      <div className="text-muted-foreground">Qty</div>
                                      <div className="font-medium">{item.quantity || 1}</div>
                                    </div>
                                    {item.unit_price && (
                                      <div className="text-right">
                                        <div className="text-muted-foreground">Unit Price</div>
                                        <div className="font-medium">{formatCurrency(item.unit_price)}</div>
                                      </div>
                                    )}
                                    {item.total_price && (
                                      <div className="text-right">
                                        <div className="text-muted-foreground">Total</div>
                                        <div className="font-semibold">{formatCurrency(item.total_price)}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              No line items found for this purchase order
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                </React.Fragment>)}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <VendorOrderDetailModal open={!!editingVendor} onOpenChange={open => {
      if (!open) setEditingVendor(null);
    }} vendor={editingVendor} />

      <TransactionEditModal open={!!editingTransaction} onOpenChange={open => {
      if (!open) setEditingTransaction(null);
    }} transaction={editingTransaction} onSuccess={() => {
      refetch();
      onVendorUpdate?.();
    }} />

      <PartialPaymentModal open={!!partialPaymentTx} onOpenChange={open => {
      if (!open) setPartialPaymentTx(null);
    }} transactionId={partialPaymentTx?.id || ''} totalAmount={partialPaymentTx?.amount || 0} vendorName={partialPaymentTx?.vendorName || ''} poNumber={partialPaymentTx?.description || ''} onConfirm={handlePartialPayment} />

      {deleteDialogTx && (
        <PartialPaymentDeleteDialog
          open={!!deleteDialogTx}
          onOpenChange={(open) => {
            if (!open) setDeleteDialogTx(null);
          }}
          transactionDescription={deleteDialogTx.description}
          remainingAmount={deleteDialogTx.amount}
          paidAmount={deleteDialogAmounts.paidAmount}
          totalAmount={deleteDialogAmounts.totalAmount}
          onDeleteRemaining={handleDeleteRemainingOnly}
          onReverseAll={handleReverseEntirePayment}
        />
      )}
    </Card>
    </div>
  );
};
