import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingDown, Search, Edit, Trash2, Calendar, Receipt, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  status: 'pending' | 'paid';
  category: string;
  creditCardId?: string;
}

interface ExpenseOverviewProps {
  expenses: ExpenseItem[];
  onEditExpense?: (expense: ExpenseItem) => void;
  onDeleteExpense?: (expense: ExpenseItem) => void;
}

export const ExpenseOverview = ({ expenses, onEditExpense, onDeleteExpense }: ExpenseOverviewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'description' | 'amount' | 'paymentDate'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<string>("30days");

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

      // Date range filter
      if (dateRange !== "all") {
        const now = new Date();
        const days = dateRange === "3days" ? 3 : dateRange === "7days" ? 7 : 30;
        const fromDate = new Date(now.setDate(now.getDate() - days));
        const expenseDate = new Date(expense.paymentDate);
        if (expenseDate < fromDate) return false;
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
  }, [expenses, searchTerm, sortBy, sortOrder, dateRange]);

  // Calculate summary stats
  const totalExpenses = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredAndSortedExpenses]);

  const pendingExpenses = useMemo(() => {
    return filteredAndSortedExpenses.filter(e => e.status === 'pending').length;
  }, [filteredAndSortedExpenses]);

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
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAndSortedExpenses.length} expense{filteredAndSortedExpenses.length !== 1 ? 's' : ''}
            </p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">This Period</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === "3days" ? "Last 3 days" : dateRange === "7days" ? "Last 7 days" : "Last 30 days"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Expense Details
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track and manage all your business expenses
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by description, category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Search expenses by description or category</TooltipContent>
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
                        Description
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
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Credit Card</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
                                    onClick={() => onDeleteExpense(expense)}
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
    </div>
  );
};
