import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Repeat, Pencil, Filter, Trash2, Search, ArrowUpDown } from "lucide-react";
import { useRecurringExpenses, RecurringExpense } from "@/hooks/useRecurringExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { generateRecurringDates } from "@/lib/recurringDates";
import { useNavigate } from "react-router-dom";

export const RecurringExpensesOverview = () => {
  const navigate = useNavigate();
  const { recurringExpenses, isLoading, updateRecurringExpense, deleteRecurringExpense } = useRecurringExpenses();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'start_date' | 'frequency'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<RecurringExpense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    transaction_name: string;
    amount: string;
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | '2-months' | '3-months' | 'weekdays';
    start_date: string;
    end_date: string;
    is_active: boolean;
    type: 'income' | 'expense';
    category: string;
    notes: string;
  }>({
    name: "",
    transaction_name: "",
    amount: "",
    frequency: "monthly",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: "",
    is_active: true,
    type: "expense",
    category: "",
    notes: "",
  });

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = recurringExpenses;
    
    if (!showInactive) {
      filtered = filtered.filter(item => item.is_active);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.transaction_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'amount':
          comparison = Number(a.amount) - Number(b.amount);
          break;
        case 'start_date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case 'frequency':
          const frequencyOrder = { daily: 1, weekdays: 2, weekly: 3, 'bi-weekly': 4, monthly: 5, '2-months': 6, '3-months': 7 };
          comparison = frequencyOrder[a.frequency] - frequencyOrder[b.frequency];
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [recurringExpenses, showInactive, filterType, searchTerm, sortBy, sortOrder]);

  const activeTransactions = recurringExpenses.filter(item => item.is_active);
  const activeIncome = activeTransactions.filter(item => item.type === 'income');
  const activeExpenses = activeTransactions.filter(item => item.type === 'expense');
  
  // Calculate exact monthly amount based on actual calendar occurrences
  const currentMonth = new Date();
  
  const totalMonthlyIncome = activeIncome
    .reduce((sum, item) => {
      const occurrences = generateRecurringDates(item, startOfMonth(currentMonth), endOfMonth(currentMonth));
      return sum + (occurrences.length * Number(item.amount));
    }, 0);
    
  const totalMonthlyExpense = activeExpenses
    .reduce((sum, item) => {
      const occurrences = generateRecurringDates(item, startOfMonth(currentMonth), endOfMonth(currentMonth));
      return sum + (occurrences.length * Number(item.amount));
    }, 0);

  const maxEndDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd');

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      transaction_name: expense.transaction_name || "",
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      start_date: expense.start_date,
      end_date: expense.end_date || "",
      is_active: expense.is_active,
      type: expense.type,
      category: expense.category || "",
      notes: expense.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (expense: RecurringExpense) => {
    setDeletingExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingExpense) {
      deleteRecurringExpense(deletingExpense.id);
      setIsDeleteDialogOpen(false);
      setDeletingExpense(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    // Validate end date is within 3 months
    if (formData.end_date && formData.end_date > maxEndDate) {
      return; // Prevent submission
    }

    const expenseData = {
      id: editingExpense.id,
      name: formData.name,
      transaction_name: formData.transaction_name || null,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      is_active: formData.is_active,
      type: formData.type,
      category: formData.category || null,
      notes: formData.notes || null,
    };

    updateRecurringExpense(expenseData);
    setIsEditDialogOpen(false);
    setEditingExpense(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring Transactions
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              <Filter className="h-4 w-4 mr-1" />
              {showInactive ? 'Hide' : 'Show'} Inactive
            </Button>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="h-9">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="start_date">Start Date</SelectItem>
                  <SelectItem value="frequency">Frequency</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Repeat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recurring transactions yet</p>
            <p className="text-sm mt-1">Add one to track your regular income and expenses</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${totalMonthlyIncome.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activeIncome.length} active</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${totalMonthlyExpense.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activeExpenses.length} active</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">
                {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </p>
              {filteredTransactions.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      <Badge variant={item.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                    {item.transaction_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.transaction_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.frequency}
                      </Badge>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`font-semibold ${
                        item.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${Number(item.amount).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recurring Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              value={formData.type === 'income' ? 'Income' : 'Expense'}
              disabled
              className="bg-muted cursor-not-allowed capitalize"
            />
          </div>

          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Office Rent"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="frequency">Frequency *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly (Every 2 weeks)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="2-months">Every 2 Months</SelectItem>
                <SelectItem value="3-months">Every 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date (Optional, max 3 months)</Label>
            <Input
              id="end_date"
              type="date"
              max={maxEndDate}
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category || 'No category'}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={formData.end_date ? formData.end_date > maxEndDate : false}
            >
              Update Transaction
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{deletingExpense?.name}"? This will remove all future occurrences from the calendar. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeletingExpense(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
