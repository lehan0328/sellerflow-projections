import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Calendar, DollarSign, AlertTriangle, Edit, Search, Trash2, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useVendorTransactions, type VendorTransaction } from "@/hooks/useVendorTransactions";
import { useVendors } from "@/hooks/useVendors";
import { TransactionEditModal } from "./transaction-edit-modal";
import { PartialPaymentModal } from "./partial-payment-modal";
import { PartialPaymentDeleteDialog } from "./partial-payment-delete-dialog";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";
import { BankTransaction } from "./bank-transaction-log";

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
  const {
    transactions,
    markAsPaid,
    markAsPartiallyPaid,
    deleteTransaction,
    refetch
  } = useVendorTransactions();
  const { vendors } = useVendors();
  const { getMatchesForVendorTransaction } = useTransactionMatching(bankTransactions, transactions, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'vendorName' | 'amount' | 'dueDate'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<string>("30days");
  const [editingTransaction, setEditingTransaction] = useState<VendorTransaction | null>(null);
  const [partialPaymentTx, setPartialPaymentTx] = useState<VendorTransaction | null>(null);
  const [deleteDialogTx, setDeleteDialogTx] = useState<VendorTransaction | null>(null);

  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch();
    }
  }, [refreshKey]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = transactions.filter(tx => {
      // Hide parent transactions marked as partially_paid and .1 transactions
      if (tx.status === 'partially_paid' || tx.description.endsWith('.1')) {
        return false;
      }

      // Search filter
      const matchesSearch = tx.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.amount.toString().includes(searchTerm);
      
      if (!matchesSearch) return false;

      // Date range filter
      if (dateRange !== "all" && tx.dueDate) {
        const now = new Date();
        const days = dateRange === "3days" ? 3 : dateRange === "7days" ? 7 : 30;
        const fromDate = new Date(now.setDate(now.getDate() - days));
        const txDate = new Date(tx.dueDate);
        if (txDate < fromDate) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'vendorName') {
        comparison = a.vendorName.localeCompare(b.vendorName);
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'dueDate') {
        comparison = (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, searchTerm, sortBy, sortOrder, dateRange]);

  // Calculate summary stats
  const totalAmount = filteredAndSortedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const pendingTransactions = filteredAndSortedTransactions.filter(tx => 
    tx.status === 'pending' && (!tx.dueDate || new Date(tx.dueDate) >= new Date())
  );
  const pendingCount = pendingTransactions.length;

  const getStatusColor = (status: string, dueDate?: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = dueDate ? new Date(dueDate) : null;
    
    if (due) {
      due.setHours(0, 0, 0, 0);
    }

    if (status === 'completed' || status === 'paid') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
    }
    if (status === 'pending' && due && due < today) {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800';
  };

  const getStatusText = (status: string, dueDate?: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = dueDate ? new Date(dueDate) : null;
    
    if (due) {
      due.setHours(0, 0, 0, 0);
    }

    if (status === 'completed' || status === 'paid') return 'paid';
    if (status === 'pending' && due && due < today) return 'overdue';
    return 'pending';
  };

  const handleMarkAsPaid = async (tx: VendorTransaction) => {
    await markAsPaid(tx.id);
    onVendorUpdate?.();
  };

  const handleDelete = async (tx: VendorTransaction) => {
    await deleteTransaction(tx.id);
    setDeleteDialogTx(null);
    onVendorUpdate?.();
  };

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
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAndSortedTransactions.length} transaction{filteredAndSortedTransactions.length !== 1 ? 's' : ''}
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Period</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === "3days" ? "Last 3 days" : dateRange === "7days" ? "Last 7 days" : "Last 30 days"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Details */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Vendor Details
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track and manage all your vendor payments
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by vendor, description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Search vendors by name or description</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full md:w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3days">Last 3 days</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No vendor transactions found. Add a purchase order to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedTransactions.map((tx) => {
                    const statusText = getStatusText(tx.status, tx.dueDate);
                    
                    return (
                      <TableRow key={tx.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{tx.vendorName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {tx.dueDate ? format(tx.dueDate, 'MMM dd, yyyy') : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {tx.creditCardId ? (
                              <>
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Credit Card</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Cash</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={cn("capitalize border", getStatusColor(tx.status, tx.dueDate))}
                          >
                            {statusText}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {statusText === 'pending' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkAsPaid(tx)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Mark as paid</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingTransaction(tx)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit transaction</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteDialogTx(tx)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete transaction</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          onSaved={() => {
            setEditingTransaction(null);
            refetch();
            onVendorUpdate?.();
          }}
        />
      )}

      {partialPaymentTx && (
        <PartialPaymentModal
          transaction={partialPaymentTx}
          open={!!partialPaymentTx}
          onOpenChange={(open) => !open && setPartialPaymentTx(null)}
          onSaved={() => {
            setPartialPaymentTx(null);
            refetch();
            onVendorUpdate?.();
          }}
        />
      )}

      {deleteDialogTx && (
        <PartialPaymentDeleteDialog
          transaction={deleteDialogTx}
          open={!!deleteDialogTx}
          onOpenChange={(open) => !open && setDeleteDialogTx(null)}
          onConfirm={() => handleDelete(deleteDialogTx)}
          paidAmount={0}
          totalAmount={deleteDialogTx.amount}
        />
      )}
    </div>
  );
};