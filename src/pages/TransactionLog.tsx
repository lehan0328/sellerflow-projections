import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Archive,
  TrendingDown,
  TrendingUp,
  Building2,
  CreditCard,
  User,
  Receipt,
  Calendar,
  DollarSign,
  ArrowUpDown,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useArchivedBankTransactions } from "@/hooks/useArchivedBankTransactions";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface DeletedTransaction {
  id: string;
  transaction_type: 'vendor' | 'income';
  name: string;
  amount: number;
  description: string;
  payment_date: string;
  status: string;
  category: string;
  deleted_at: string;
}

type TransactionType = 'all' | 'bank' | 'vendor' | 'income' | 'deleted';
type SortField = 'date' | 'amount' | 'name';
type SortOrder = 'asc' | 'desc';

export default function TransactionLog() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deletedTransactions, setDeletedTransactions] = useState<DeletedTransaction[]>([]);

  const { transactions: archivedBankTx, isLoading: bankLoading } = useArchivedBankTransactions();
  const { transactions: vendorTransactions } = useVendorTransactions();
  const { incomeItems } = useIncome();

  // Fetch deleted transactions
  const fetchDeletedTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('deleted_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted transactions:', error);
      return;
    }

    setDeletedTransactions((data || []) as DeletedTransaction[]);
  }, []);

  useEffect(() => {
    fetchDeletedTransactions();
  }, [fetchDeletedTransactions]);

  // Delete all archived transactions permanently
  const handleDeleteAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        toast.error('Account not found');
        return;
      }

      // Delete all from deleted_transactions table
      const { error: deletedError } = await supabase
        .from('deleted_transactions')
        .delete()
        .eq('user_id', user.id);

      if (deletedError) throw deletedError;

      // Delete all archived bank transactions
      const { error: bankError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('account_id', profile.account_id)
        .eq('archived', true);

      if (bankError) throw bankError;

      // Delete all archived income (status = 'received')
      const { error: incomeError } = await supabase
        .from('income')
        .delete()
        .eq('account_id', profile.account_id)
        .eq('archived', true);

      if (incomeError) throw incomeError;

      // Delete all archived vendor transactions (status = 'completed' or 'paid')
      const { error: vendorError } = await supabase
        .from('transactions')
        .delete()
        .eq('type', 'purchase_order')
        .in('status', ['completed', 'paid'])
        .eq('archived', true);

      if (vendorError) throw vendorError;

      // Refresh the page data
      fetchDeletedTransactions();
      
      toast.success('All archived transactions deleted permanently');
    } catch (error) {
      console.error('Error deleting archived transactions:', error);
      toast.error('Failed to delete archived transactions');
    }
  };

  // Get completed/paid vendor and income transactions (these are effectively archived)
  const archivedVendorTx = vendorTransactions.filter(tx => tx.status === 'completed' || tx.status === 'paid');
  const archivedIncomeTx = incomeItems.filter(item => item.status === 'received');

  // Combine all archived transactions
  const allArchivedTransactions = useMemo(() => {
    const transactions = [
      ...archivedBankTx.map(tx => ({
        id: tx.id,
        type: 'bank' as const,
        name: tx.merchantName || tx.name,
        amount: tx.amount,
        date: tx.date,
        description: `${tx.accountName} - ${tx.name}`,
        matchedWith: tx.matchedType ? `Matched with ${tx.matchedType}` : undefined,
        category: tx.category?.join(', ') || undefined,
        status: 'archived',
      })),
      ...archivedVendorTx.map(tx => ({
        id: tx.id,
        type: 'vendor' as const,
        name: tx.vendorName,
        amount: tx.amount,
        date: new Date(tx.dueDate || tx.transactionDate),
        description: tx.description,
        matchedWith: undefined,
        category: tx.category || undefined,
        status: tx.status,
      })),
      ...archivedIncomeTx.map(tx => ({
        id: tx.id,
        type: 'income' as const,
        name: tx.source,
        amount: tx.amount,
        date: new Date(tx.paymentDate),
        description: tx.description,
        matchedWith: undefined,
        category: tx.category || undefined,
        status: tx.status,
      })),
      ...deletedTransactions.map(tx => ({
        id: tx.id,
        type: 'deleted' as const,
        name: tx.name,
        amount: tx.amount,
        date: new Date(tx.payment_date),
        description: tx.description,
        matchedWith: undefined,
        category: tx.category || undefined,
        status: 'deleted',
      })),
    ];

    return transactions;
  }, [archivedBankTx, archivedVendorTx, archivedIncomeTx, deletedTransactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allArchivedTransactions;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.name.toLowerCase().includes(term) ||
        tx.description.toLowerCase().includes(term) ||
        tx.amount.toString().includes(term) ||
        tx.category?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          aValue = a.date.getTime();
          bValue = b.date.getTime();
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [allArchivedTransactions, typeFilter, searchTerm, sortField, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    const bankCount = filteredTransactions.filter(tx => tx.type === 'bank').length;
    const vendorCount = filteredTransactions.filter(tx => tx.type === 'vendor').length;
    const incomeCount = filteredTransactions.filter(tx => tx.type === 'income').length;
    const deletedCount = filteredTransactions.filter(tx => tx.type === 'deleted').length;
    
    const totalAmount = filteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      total: filteredTransactions.length,
      bank: bankCount,
      vendor: vendorCount,
      income: incomeCount,
      deleted: deletedCount,
      totalAmount,
    };
  }, [filteredTransactions]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="h-4 w-4" />;
      case 'vendor':
        return <TrendingDown className="h-4 w-4" />;
      case 'income':
        return <TrendingUp className="h-4 w-4" />;
      case 'deleted':
        return <Archive className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'bank':
        return 'default';
      case 'vendor':
        return 'destructive';
      case 'income':
        return 'secondary';
      case 'deleted':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Archive className="h-8 w-8 text-primary" />
                  Archived Transactions
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View all archived, matched, and deleted transactions
                </p>
              </div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Archived Transactions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {stats.total} archived transactions ({formatCurrency(stats.totalAmount)}). 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete All Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Total Archived
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${stats.totalAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Matched
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bank}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vendor}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.income}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Deleted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.deleted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, description, amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>

              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={(value: TransactionType) => setTypeFilter(value)}>
                  <SelectTrigger className="w-[140px] bg-background/50">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bank">Bank Matched</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
                  <SelectTrigger className="w-[120px] bg-background/50">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-background/50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Transactions List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">
              {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              {typeFilter === 'all' ? 'Showing all archived transactions' : `Showing ${typeFilter} transactions`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bankLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading archived transactions...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || typeFilter !== 'all' 
                      ? 'No archived transactions match your filters.' 
                      : 'No archived transactions yet.'}
                  </p>
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="group p-4 rounded-lg border border-border/50 hover:border-border hover:bg-accent/5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getTypeBadgeVariant(tx.type)} className="gap-1">
                            {getTypeIcon(tx.type)}
                            <span className="capitalize">{tx.type}</span>
                          </Badge>
                          {tx.matchedWith && (
                            <Badge variant="outline" className="text-xs">
                              {tx.matchedWith}
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-base mb-1 truncate">
                          {tx.name}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {tx.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(tx.date, 'MMM dd, yyyy')}
                          </div>
                          {tx.category && (
                            <div className="flex items-center gap-1">
                              <Receipt className="h-3 w-3" />
                              {tx.category}
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          tx.type === 'income' 
                            ? 'text-green-600 dark:text-green-500' 
                            : tx.type === 'vendor'
                            ? 'text-red-600 dark:text-red-500'
                            : 'text-foreground'
                        }`}>
                          {tx.type === 'income' ? '+' : tx.type === 'vendor' ? '-' : ''}
                          ${Math.abs(tx.amount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
