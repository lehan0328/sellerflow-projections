import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CategoryManagement() {
  const expenseCategories = useCategories('expense');
  const incomeCategories = useCategories('income');
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newIncomeCategory, setNewIncomeCategory] = useState("");

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCategory.trim()) return;
    await expenseCategories.addCategory(newExpenseCategory.trim());
    setNewExpenseCategory("");
  };

  const handleAddIncomeCategory = async () => {
    if (!newIncomeCategory.trim()) return;
    await incomeCategories.addCategory(newIncomeCategory.trim());
    setNewIncomeCategory("");
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
            <TabsTrigger value="income">Income Categories</TabsTrigger>
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    {!category.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => expenseCategories.deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    {!category.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => incomeCategories.deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
