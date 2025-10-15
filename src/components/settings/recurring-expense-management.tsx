import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useRecurringExpenses, RecurringExpense } from "@/hooks/useRecurringExpenses";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, addMonths } from "date-fns";

export const RecurringExpenseManagement = () => {
  const { recurringExpenses, isLoading, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense } = useRecurringExpenses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
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

  const resetForm = () => {
    setFormData({
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
    setEditingExpense(null);
  };

  const maxEndDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate end date is within 3 months
    if (formData.end_date && formData.end_date > maxEndDate) {
      return; // Prevent submission
    }
    
    const expenseData = {
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

    if (editingExpense) {
      updateRecurringExpense({ id: editingExpense.id, ...expenseData });
    } else {
      createRecurringExpense(expenseData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

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
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring Transactions
            </CardTitle>
            <CardDescription>
              Manage your regular income and expenses that repeat automatically
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Recurring Transaction" : "Add Recurring Transaction"}
            </DialogTitle>
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
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={formData.end_date ? formData.end_date > maxEndDate : false}
                  >
                    {editingExpense ? "Update" : "Add"} Transaction
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : recurringExpenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Repeat className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No recurring transactions yet</p>
            <p className="text-sm mt-2">Add your first recurring income or expense to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{expense.name}</h3>
                    <Badge variant={expense.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                      {expense.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                    {!expense.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  {expense.transaction_name && (
                    <p className="text-sm text-muted-foreground">{expense.transaction_name}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline">{expense.frequency}</Badge>
                    {expense.category && <span>{expense.category}</span>}
                    <span>Starts: {format(new Date(expense.start_date), 'MMM dd, yyyy')}</span>
                    {expense.end_date && (
                      <span>Ends: {format(new Date(expense.end_date), 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                  {expense.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      expense.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${Number(expense.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(expense)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this recurring transaction?')) {
                          deleteRecurringExpense(expense.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
