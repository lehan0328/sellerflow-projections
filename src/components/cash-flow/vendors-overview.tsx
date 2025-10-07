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
import { Building2, Calendar, DollarSign, AlertTriangle, Edit, CreditCard, Search, ArrowUpDown, Filter, Trash2, Link2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useVendorTransactions, type VendorTransaction } from "@/hooks/useVendorTransactions";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { VendorOrderDetailModal } from "./vendor-order-detail-modal";
import { TransactionEditModal } from "./transaction-edit-modal";
import { PartialPaymentModal } from "./partial-payment-modal";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";
import { BankTransaction } from "./bank-transaction-log";
import { toast } from "sonner";
import * as React from "react";

interface VendorsOverviewProps {
  bankTransactions?: BankTransaction[];
  onVendorUpdate?: () => void;
  refreshKey?: number;
}

export const VendorsOverview = ({ bankTransactions = [], onVendorUpdate, refreshKey }: VendorsOverviewProps) => {
  const navigate = useNavigate();
  const { transactions, markAsPaid, markAsPartiallyPaid, updateRemarks, deleteTransaction, refetch } = useVendorTransactions();
  const { vendors } = useVendors();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'vendorName' | 'amount' | 'dueDate'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<VendorTransaction | null>(null);
  const [dateRange, setDateRange] = useState<string>("all");
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();
  const [partialPaymentTx, setPartialPaymentTx] = useState<VendorTransaction | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null);

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
        const matchesSearch = tx.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.amount.toString().includes(searchTerm);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'overdue') {
        matchesStatus = tx.status === 'pending' && tx.dueDate && new Date(tx.dueDate) < new Date();
      } else if (statusFilter === 'paid') {
        matchesStatus = tx.status === 'completed' || tx.status === 'paid';
      }
      
      if (!matchesStatus) return false;

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
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      if (typeof aValue === 'number') {
        return sortOrder === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
      }

      return 0;
    });
  }, [transactions, searchTerm, selectedVendor, statusFilter, sortBy, sortOrder, dateRange, customFromDate, customToDate]);

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

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      toast.success("Transaction deleted successfully");
      onVendorUpdate?.();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error("Failed to delete transaction");
    }
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
      await markAsPartiallyPaid(
        data.transactionId,
        data.amountPaid,
        data.remainingBalance,
        data.newDueDate
      );
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
  const overdueAmount = filteredAndSortedTransactions
    .filter(tx => {
      if (!tx.dueDate || tx.status === 'completed' || tx.status === 'paid') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(tx.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <Card className="shadow-card h-[700px] flex flex-col">
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
              <span className="font-semibold">${totalOwed.toLocaleString()}</span>
            </div>
            {overdueAmount > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-semibold">
                  ${overdueAmount.toLocaleString()} Overdue
                </span>
              </div>
            )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/transactions?tab=vendors")}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View All Transactions</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1 max-w-sm flex items-center space-x-2">
            <Combobox
              options={vendorSearchOptions}
              value={selectedVendor || searchTerm}
              onValueChange={handleVendorSearch}
              placeholder="Search vendors..."
              emptyText="No vendors found."
              className="flex-1"
            />
            {(selectedVendor || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedVendor('');
                  setSearchTerm('');
                }}
                className="px-3"
              >
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

          {dateRange === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customFromDate && "text-muted-foreground")}>
                    {customFromDate ? format(customFromDate, "MMM dd") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customFromDate} onSelect={setCustomFromDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customToDate && "text-muted-foreground")}>
                    {customToDate ? format(customToDate, "MMM dd") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customToDate} onSelect={setCustomToDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}

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
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
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
              {filteredAndSortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {selectedVendor ? `No purchase orders found for ${vendorSearchOptions.find(v => v.value === selectedVendor)?.label || selectedVendor}.` :
                     searchTerm ? 'No transactions found matching your search.' : 
                     'No vendor purchase orders.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.vendorName}</TableCell>
                    <TableCell>{tx.description || 'N/A'}</TableCell>
                    <TableCell className="font-semibold">
                      ${(tx.amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {tx.dueDate
                        ? new Date(tx.dueDate).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(tx)} className="text-xs">
                        {getStatusIcon(tx)}
                        <span className="ml-1">{getStatusText(tx)}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tx.remarks || 'Ordered'}
                        onValueChange={(value) => updateRemarks(tx.id, value)}
                      >
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
                                onClick={() => setEditingTransaction(tx)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit transaction</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {tx.status !== 'completed' && tx.status !== 'paid' && tx.dueDate && (
                          <TooltipProvider>
                            <Tooltip>
                              <AlertDialog 
                                open={paymentDialogOpen === tx.id}
                                onOpenChange={(open) => setPaymentDialogOpen(open ? tx.id : null)}
                              >
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700"
                                    >
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
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setPaymentDialogOpen(null);
                                        setPartialPaymentTx(tx);
                                      }}
                                    >
                                      Mark as Partially Paid
                                    </Button>
                                    <AlertDialogAction onClick={() => handlePayToday(tx.id)}>
                                      Mark as Fully Paid
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <AlertDialog>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete transaction</p>
                              </TooltipContent>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this purchase order transaction. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <VendorOrderDetailModal
        open={!!editingVendor}
        onOpenChange={(open) => {
          if (!open) setEditingVendor(null);
        }}
        vendor={editingVendor}
      />

      <TransactionEditModal
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onSuccess={() => {
          refetch();
          onVendorUpdate?.();
        }}
      />

      <PartialPaymentModal
        open={!!partialPaymentTx}
        onOpenChange={(open) => {
          if (!open) setPartialPaymentTx(null);
        }}
        transactionId={partialPaymentTx?.id || ''}
        totalAmount={partialPaymentTx?.amount || 0}
        vendorName={partialPaymentTx?.vendorName || ''}
        poNumber={partialPaymentTx?.description || ''}
        onConfirm={handlePartialPayment}
      />
    </Card>
  );
};