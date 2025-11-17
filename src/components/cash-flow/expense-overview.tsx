import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { DollarSign, TrendingDown, Search, Edit, Trash2, Calendar, Receipt, CreditCard, Filter, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useCreditCards } from "@/hooks/useCreditCards";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  status: 'pending' | 'paid';
  category: string;
  creditCardId?: string;
  creditCardName?: string;
}

interface ExpenseOverviewProps {
  expenses: ExpenseItem[];
  onEditExpense?: (expense: ExpenseItem) => void;
  onDeleteExpense?: (expense: ExpenseItem) => void;
  onCreditCardChange?: () => void;
}

export const ExpenseOverview = ({ expenses, onEditExpense, onDeleteExpense, onCreditCardChange }: ExpenseOverviewProps) => {
  const { creditCards } = useCreditCards();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'description' | 'amount' | 'paymentDate'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<string>("30days");
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = (expense: ExpenseItem) => {
    setDeletingExpense(expense);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deletingExpense) {
      onDeleteExpense?.(deletingExpense);
    }
    setShowDeleteDialog(false);
    setDeletingExpense(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingExpense(null);
  };

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = expenses.filter(expense => {
      // Search filter
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.amount.toString().includes(searchTerm) ||
        (expense.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && expense.status !== statusFilter) return false;

      // Payment method filter
      if (paymentMethodFilter === 'cash' && expense.creditCardId) return false;
      if (paymentMethodFilter === 'credit' && !expense.creditCardId) return false;

      // Date range filter
      if (dateRange !== "all") {
        const expenseDate = new Date(expense.paymentDate);
        
        if (dateRange === "custom") {
          if (customFromDate && expenseDate < customFromDate) return false;
          if (customToDate && expenseDate > customToDate) return false;
        } else {
          const now = new Date();
          const days = dateRange === "3days" ? 3 : dateRange === "7days" ? 7 : 30;
          const fromDate = new Date(now.setDate(now.getDate() - days));
          if (expenseDate < fromDate) return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'paymentDate') {
        comparison = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [expenses, searchTerm, sortBy, sortOrder, dateRange, categoryFilter, statusFilter, paymentMethodFilter, customFromDate, customToDate]);

  // Calculate summary stats
  const totalExpenses = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  const totalCashExpenses = useMemo(() => {
    return filteredAndSortedExpenses.filter(e => !e.creditCardId).reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  const totalCreditExpenses = useMemo(() => {
    return filteredAndSortedExpenses.filter(e => e.creditCardId).reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  const pendingExpenses = useMemo(() => {
    return filteredAndSortedExpenses.filter(e => e.status === 'pending').length;
  }, [filteredAndSortedExpenses]);

  const thisMonthAmount = useMemo(() => {
    const today = new Date();
    return filteredAndSortedExpenses.filter(expense => {
      if (!expense.paymentDate) return false;
      const paymentDate = new Date(expense.paymentDate);
      return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
    }).reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  const thisMonthCashExpenses = useMemo(() => {
    const today = new Date();
    return filteredAndSortedExpenses.filter(expense => {
      if (!expense.paymentDate || expense.creditCardId) return false;
      const paymentDate = new Date(expense.paymentDate);
      return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
    }).reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  const thisMonthCreditExpenses = useMemo(() => {
    const today = new Date();
    return filteredAndSortedExpenses.filter(expense => {
      if (!expense.paymentDate || !expense.creditCardId) return false;
      const paymentDate = new Date(expense.paymentDate);
      return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
    }).reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));
    return categories.sort();
  }, [expenses]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>Cash: {formatCurrency(totalCashExpenses)}</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>Credit: {formatCurrency(totalCreditExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingExpenses}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
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
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>Cash: {formatCurrency(thisMonthCashExpenses)}</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>Credit: {formatCurrency(thisMonthCreditExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Expense Details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track and manage all your business expenses
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                    <SelectItem value="all">All</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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
                <Select 
                  value={`${sortBy}-${sortOrder}`} 
                  onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split('-') as [typeof sortBy, typeof sortOrder];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                    <SelectItem value="paymentDate-asc">Date (Old)</SelectItem>
                    <SelectItem value="paymentDate-desc">Date (New)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                    <SelectItem value="amount-desc">Amount (High)</SelectItem>
                    <SelectItem value="description-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="description-desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredAndSortedExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-muted/50 rounded-full">
                  <Receipt className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-lg font-medium text-foreground">No expenses found</p>
                <p className="text-sm">Your expenses will appear here once added</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSortBy('description');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="hover:bg-transparent -ml-3 h-8 font-semibold"
                      >
                        Payee
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSortBy('amount');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="hover:bg-transparent -ml-3 h-8 font-semibold"
                      >
                        Amount
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSortBy('paymentDate');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="hover:bg-transparent -ml-3 h-8 font-semibold"
                      >
                        Payment Date
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">Payment Method</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedExpenses.map((expense) => (
                    <TableRow 
                      key={expense.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-red-100 dark:bg-red-900/20 rounded">
                            <Receipt className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="font-medium">{expense.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {expense.category || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(expense.paymentDate), 'MMM dd, yyyy')}
                      </TableCell>
                       <TableCell>
                        {expense.creditCardId ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-2">
                            <CreditCard className="h-3.5 w-3.5" />
                            <span className="max-w-[150px] truncate">
                              {creditCards.find(c => c.id === expense.creditCardId)?.account_name || 'Credit Card'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-2">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Cash</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border font-medium", getStatusColor(expense.status))}>
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {onEditExpense && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEditExpense(expense)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit expense</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {onDeleteExpense && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(expense)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete expense</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingExpense?.description}"?
              <br /><br />
              <strong className="text-destructive">This action is permanent and cannot be recovered.</strong> The transaction will be completely removed from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
