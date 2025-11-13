import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, Calendar, TrendingUp, Plus, Edit, Search, ArrowUpDown, Trash2, Link2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";
import { BankTransaction } from "./bank-transaction-log";
import { toast } from "sonner";
import * as React from "react";

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  source: string;
  status: 'received' | 'pending' | 'overdue';
  category: string;
  isRecurring: boolean;
  customerId?: string;
  customer?: string;
}

interface IncomeOverviewProps {
  incomeItems: IncomeItem[];
  bankTransactions?: BankTransaction[];
  onCollectToday?: (income: IncomeItem) => void;
  onEditIncome?: (income: IncomeItem) => void;
  onDeleteIncome?: (income: IncomeItem) => void;
  onMatchTransaction?: (income: IncomeItem) => Promise<void>;
}

export const IncomeOverview = ({ incomeItems, bankTransactions = [], onCollectToday, onEditIncome, onDeleteIncome, onMatchTransaction }: IncomeOverviewProps) => {
  const navigate = useNavigate();
  const { matches, getMatchesForIncome } = useTransactionMatching(bankTransactions, [], incomeItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'description' | 'amount' | 'paymentDate' | 'source'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<string>("all");
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();
  
  // State for confirmation dialogs
  const [confirmingIncome, setConfirmingIncome] = useState<IncomeItem | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deletingIncome, setDeletingIncome] = useState<IncomeItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filter and sort income items
  const filteredAndSortedIncomes = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = incomeItems.filter(income => {
      // Hide archived (received) income
      if (income.status === 'received') return false;

      // Automatically exclude overdue income from calculations
      const paymentDate = new Date(income.paymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      if (income.status === 'pending' && paymentDate < today) {
        return false;
      }

      // Search filter
      const matchesSearch = income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        income.amount.toString().includes(searchTerm) ||
        income.source.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Date range filter
      if (dateRange !== "all" && dateRange !== "custom") {
        const now = new Date();
        const days = dateRange === "3days" ? 3 : dateRange === "7days" ? 7 : 30;
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (income.paymentDate < startDate) return false;
      } else if (dateRange === "custom" && customFromDate && customToDate) {
        if (income.paymentDate < customFromDate || income.paymentDate > customToDate) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'paymentDate') {
        aValue = a.paymentDate.getTime();
        bValue = b.paymentDate.getTime();
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
  }, [incomeItems, searchTerm, sortBy, sortOrder, dateRange, customFromDate, customToDate]);

  const handleCollectToday = (income: IncomeItem) => {
    // Update income status to received - this will be handled by the parent component
    // which will update the database and refresh the data
    onCollectToday?.(income);
  };

  const handleReceiveTodayClick = (income: IncomeItem) => {
    setConfirmingIncome(income);
    setShowConfirmDialog(true);
  };

  const handleConfirmReceiveToday = () => {
    if (confirmingIncome) {
      handleCollectToday(confirmingIncome);
    }
    setShowConfirmDialog(false);
    setConfirmingIncome(null);
  };

  const handleCancelReceiveToday = () => {
    setShowConfirmDialog(false);
    setConfirmingIncome(null);
  };

  const handleDeleteClick = (income: IncomeItem) => {
    setDeletingIncome(income);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deletingIncome) {
      onDeleteIncome?.(deletingIncome);
    }
    setShowDeleteDialog(false);
    setDeletingIncome(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingIncome(null);
  };

  const handleMatch = async (income: IncomeItem) => {
    try {
      // Create a completed transaction record first
      if (onMatchTransaction) {
        await onMatchTransaction(income);
      }
      
      // Then mark as received by updating status
      if (onCollectToday) {
        onCollectToday(income);
      }
      
      toast.success("Match successful", {
        description: `${income.source} transaction has been matched.`
      });
    } catch (error) {
      console.error('Error matching transaction:', error);
      toast.error("Failed to match transaction");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'secondary';
      case 'pending':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'overdue') {
      return <Calendar className="h-4 w-4" />;
    }
    return <TrendingUp className="h-4 w-4" />;
  };

  const totalExpected = filteredAndSortedIncomes.reduce((sum, income) => sum + income.amount, 0);
  const pendingAmount = filteredAndSortedIncomes
    .filter(i => i.status === 'pending')
    .reduce((sum, income) => sum + income.amount, 0);
  const pendingCount = filteredAndSortedIncomes.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalExpected)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAndSortedIncomes.length} income{filteredAndSortedIncomes.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting receipt</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Period</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalExpected)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === "3days" ? "Last 3 days" : dateRange === "7days" ? "Last 7 days" : dateRange === "30days" ? "Last 30 days" : "All time"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Income Details Card */}
      <Card className="shadow-card h-[700px] flex flex-col border-t-4 border-t-primary">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Income Overview</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Expected:</span>
                <span className="font-semibold">{formatCurrency(totalExpected)}</span>
              </div>
              {pendingAmount > 0 && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-500 font-semibold">
                    {formatCurrency(pendingAmount)} Pending
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/transactions?tab=income")}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View All Transactions</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search income or amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              <SelectContent>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="source">Source</SelectItem>
                <SelectItem value="paymentDate">Payment Date</SelectItem>
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
                <TableHead>Customer</TableHead>
                <TableHead>Ref# / Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedIncomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No income items found matching your search.' : 'No income items to display.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.source}</TableCell>
                    <TableCell>{income.description}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(income.amount)}
                    </TableCell>
                    <TableCell>
                      {income.paymentDate.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Badge variant={getStatusColor(income.status)} className="text-xs">
                            {getStatusIcon(income.status)}
                            <span className="ml-1 capitalize">{income.status}</span>
                          </Badge>
                          {income.isRecurring && (
                            <Badge variant="secondary" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                        {getMatchesForIncome(income.id).length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  <Link2 className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getMatchesForIncome(income.id).length} potential bank transaction match(es)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onEditIncome?.(income)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit income details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {getMatchesForIncome(income.id).length > 0 && income.status === 'pending' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleMatch(income)}
                                >
                                  <Link2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Match with bank transaction</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {income.status === 'pending' && getMatchesForIncome(income.id).length === 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleReceiveTodayClick(income)}
                                >
                                  <DollarSign className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mark as received today</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteClick(income)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete transaction</p>
                            </TooltipContent>
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
      
      {/* Receive Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this income as received? This will:
              <br />
              • Keep the original payment date ({confirmingIncome?.paymentDate.toLocaleDateString()})
              • Add {formatCurrency(confirmingIncome?.amount || 0)} to your available cash
              • Mark the payment as completed
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReceiveToday}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReceiveToday}
              className="bg-gradient-primary"
            >
              Yes, Receive Today
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingIncome?.description}"?
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
    </Card>
    </div>
  );
};