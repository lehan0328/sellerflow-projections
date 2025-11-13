import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CategoryManagement() {
  // Regular categories
  const expenseCategories = useCategories('expense', false);
  const incomeCategories = useCategories('income', false);
  const purchaseOrderCategories = useCategories('purchase_order', false);
  
  // Recurring categories
  const recurringExpenseCategories = useCategories('expense', true);
  const recurringIncomeCategories = useCategories('income', true);
  
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newIncomeCategory, setNewIncomeCategory] = useState("");
  const [newPurchaseOrderCategory, setNewPurchaseOrderCategory] = useState("");
  const [newRecurringExpenseCategory, setNewRecurringExpenseCategory] = useState("");
  const [newRecurringIncomeCategory, setNewRecurringIncomeCategory] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string; type: 'expense' | 'income' | 'purchase_order'; isRecurring: boolean } | null>(null);

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCategory.trim()) return;
    await expenseCategories.addCategory(newExpenseCategory.trim(), false);
    setNewExpenseCategory("");
  };

  const handleAddIncomeCategory = async () => {
    if (!newIncomeCategory.trim()) return;
    await incomeCategories.addCategory(newIncomeCategory.trim(), false);
    setNewIncomeCategory("");
  };

  const handleAddPurchaseOrderCategory = async () => {
    if (!newPurchaseOrderCategory.trim()) return;
    await purchaseOrderCategories.addCategory(newPurchaseOrderCategory.trim(), false);
    setNewPurchaseOrderCategory("");
  };

  const handleAddRecurringExpenseCategory = async () => {
    if (!newRecurringExpenseCategory.trim()) return;
    await recurringExpenseCategories.addCategory(newRecurringExpenseCategory.trim(), true);
    setNewRecurringExpenseCategory("");
  };

  const handleAddRecurringIncomeCategory = async () => {
    if (!newRecurringIncomeCategory.trim()) return;
    await recurringIncomeCategories.addCategory(newRecurringIncomeCategory.trim(), true);
    setNewRecurringIncomeCategory("");
  };

  const handleDeleteClick = (id: string, name: string, type: 'expense' | 'income' | 'purchase_order', isRecurring: boolean) => {
    setCategoryToDelete({ id, name, type, isRecurring });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    if (categoryToDelete.isRecurring) {
      if (categoryToDelete.type === 'expense') {
        await recurringExpenseCategories.deleteCategory(categoryToDelete.id);
      } else {
        await recurringIncomeCategories.deleteCategory(categoryToDelete.id);
      }
    } else {
      if (categoryToDelete.type === 'expense') {
        await expenseCategories.deleteCategory(categoryToDelete.id);
      } else if (categoryToDelete.type === 'income') {
        await incomeCategories.deleteCategory(categoryToDelete.id);
      } else if (categoryToDelete.type === 'purchase_order') {
        await purchaseOrderCategories.deleteCategory(categoryToDelete.id);
      }
    }
    
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <CardDescription>
          Manage your expense and income categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
            <TabsTrigger value="purchase-order">Purchase Order Categories</TabsTrigger>
            <TabsTrigger value="income">Income Categories</TabsTrigger>
            <TabsTrigger value="recurring-expense">Recurring Expenses</TabsTrigger>
            <TabsTrigger value="recurring-income">Recurring Income</TabsTrigger>
          </TabsList>

          <TabsContent value="expense" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New expense category"
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
              />
              <Button onClick={handleAddExpenseCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {expenseCategories.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                expenseCategories.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card min-h-[52px]"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category.id, category.name, 'expense', false)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="purchase-order" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New purchase order category"
                value={newPurchaseOrderCategory}
                onChange={(e) => setNewPurchaseOrderCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPurchaseOrderCategory()}
              />
              <Button onClick={handleAddPurchaseOrderCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {purchaseOrderCategories.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : purchaseOrderCategories.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Default categories: Inventory, Equipment, Supplies
                </p>
              ) : (
                purchaseOrderCategories.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card min-h-[52px]"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category.id, category.name, 'purchase_order', false)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New income category"
                value={newIncomeCategory}
                onChange={(e) => setNewIncomeCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddIncomeCategory()}
              />
              <Button onClick={handleAddIncomeCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {incomeCategories.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                incomeCategories.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card min-h-[52px]"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category.id, category.name, 'income', false)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="recurring-expense" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New recurring expense category"
                value={newRecurringExpenseCategory}
                onChange={(e) => setNewRecurringExpenseCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecurringExpenseCategory()}
              />
              <Button onClick={handleAddRecurringExpenseCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {recurringExpenseCategories.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recurringExpenseCategories.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Default categories: Payroll, Software, Loan
                </p>
              ) : (
                recurringExpenseCategories.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card min-h-[52px]"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category.id, category.name, 'expense', true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="recurring-income" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New recurring income category"
                value={newRecurringIncomeCategory}
                onChange={(e) => setNewRecurringIncomeCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecurringIncomeCategory()}
              />
              <Button onClick={handleAddRecurringIncomeCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {recurringIncomeCategories.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recurringIncomeCategories.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recurring income categories. Add your own.
                </p>
              ) : (
                recurringIncomeCategories.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card min-h-[52px]"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category.id, category.name, 'income', true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
