import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Repeat } from "lucide-react";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const RecurringExpensesOverview = () => {
  const { recurringExpenses, isLoading } = useRecurringExpenses();

  const activeExpenses = recurringExpenses.filter(expense => expense.is_active);
  const totalMonthly = activeExpenses
    .filter(expense => expense.frequency === 'monthly')
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring Expenses
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = '/settings?section=recurring-expenses'}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add New
        </Button>
      </CardHeader>
      <CardContent>
        {activeExpenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Repeat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recurring expenses yet</p>
            <p className="text-sm mt-1">Add one to track your regular payments</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Active Expenses</p>
                <p className="text-2xl font-bold">{activeExpenses.length}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Monthly Total</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${totalMonthly.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">Recent Expenses</p>
              {activeExpenses.slice(0, 5).map((expense) => (
                <div 
                  key={expense.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{expense.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {expense.frequency}
                      </Badge>
                      {expense.category && (
                        <span className="text-xs text-muted-foreground">
                          {expense.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      ${Number(expense.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {activeExpenses.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full mt-2"
                onClick={() => window.location.href = '/settings?section=recurring-expenses'}
              >
                View All ({activeExpenses.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
