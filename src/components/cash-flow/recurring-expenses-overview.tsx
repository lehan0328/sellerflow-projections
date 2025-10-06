import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Repeat } from "lucide-react";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const RecurringExpensesOverview = () => {
  const { recurringExpenses, isLoading } = useRecurringExpenses();

  const activeTransactions = recurringExpenses.filter(item => item.is_active);
  const activeIncome = activeTransactions.filter(item => item.type === 'income');
  const activeExpenses = activeTransactions.filter(item => item.type === 'expense');
  
  const totalMonthlyIncome = activeIncome
    .filter(item => item.frequency === 'monthly')
    .reduce((sum, item) => sum + Number(item.amount), 0);
    
  const totalMonthlyExpense = activeExpenses
    .filter(item => item.frequency === 'monthly')
    .reduce((sum, item) => sum + Number(item.amount), 0);

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
          Recurring Transactions
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
        {activeTransactions.length === 0 ? (
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
              <p className="text-sm font-medium mb-2">Recent Transactions</p>
              {activeTransactions.slice(0, 5).map((item) => (
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
                  <div className="text-right">
                    <p className={`font-semibold ${
                      item.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${Number(item.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {activeTransactions.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full mt-2"
                onClick={() => window.location.href = '/settings?section=recurring-expenses'}
              >
                View All ({activeTransactions.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
