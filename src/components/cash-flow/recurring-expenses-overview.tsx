import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Repeat, Pencil, Filter } from "lucide-react";
import { useRecurringExpenses, RecurringExpense } from "@/hooks/useRecurringExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export const RecurringExpensesOverview = () => {
  const { recurringExpenses, isLoading, updateRecurringExpense } = useRecurringExpenses();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    transaction_name: string;
    amount: string;
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'weekdays';
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

  // Filter transactions
  let filteredTransactions = recurringExpenses;
  if (!showInactive) {
    filteredTransactions = filteredTransactions.filter(item => item.is_active);
  }
  if (filterType !== 'all') {
    filteredTransactions = filteredTransactions.filter(item => item.type === filterType);
  }

  const activeTransactions = recurringExpenses.filter(item => item.is_active);
  const activeIncome = activeTransactions.filter(item => item.type === 'income');
  const activeExpenses = activeTransactions.filter(item => item.type === 'expense');
  
  // Convert all frequencies to monthly equivalent
  const getMonthlyAmount = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'daily': return amount * 30; // Average days per month
      case 'weekly': return amount * 4.33; // Average weeks per month
      case 'bi-weekly': return amount * 2.17; // Half of weekly
      case 'weekdays': return amount * 22; // Average weekdays per month
      case 'monthly': return amount;
      case 'yearly': return amount / 12;
      default: return amount;
    }
  };
  
  const totalMonthlyIncome = activeIncome
    .reduce((sum, item) => sum + getMonthlyAmount(Number(item.amount), item.frequency), 0);
    
  const totalMonthlyExpense = activeExpenses
    .reduce((sum, item) => sum + getMonthlyAmount(Number(item.amount), item.frequency), 0);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring Transactions
            </CardTitle>
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="h-9">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              <Filter className="h-4 w-4 mr-1" />
              {showInactive ? 'Hide' : 'Show'} Inactive
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/settings?section=recurring-expenses'}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add New
            </Button>
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
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
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
            <Label htmlFor="transaction_name">Transaction Name</Label>
            <Input
              id="transaction_name"
              value={formData.transaction_name}
              onChange={(e) => setFormData({ ...formData, transaction_name: e.target.value })}
              placeholder="e.g., Monthly Office Rent Payment"
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
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly (Every 2 weeks)</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
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
            <Label htmlFor="end_date">End Date (Optional)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Rent, Utilities, Software"
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
            <Button type="submit" className="flex-1">
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
    </>
  );
};
