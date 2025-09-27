import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  type: 'payment' | 'purchase' | 'adjustment';
  vendor?: string;
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

interface TransactionLogProps {
  transactions: Transaction[];
  onUndoTransaction: (transactionId: string) => void;
}

export const TransactionLog = ({ transactions, onUndoTransaction }: TransactionLogProps) => {
  const handleDelete = (transaction: Transaction) => {
    onUndoTransaction(transaction.id);
    toast.success(`Deleted transaction: ${transaction.description}`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'destructive';
      case 'purchase':
        return 'secondary';
      case 'adjustment':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const recentTransactions = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Transaction Log</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Recent: {recentTransactions.length} transactions
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={getTypeColor(transaction.type)} className="text-xs">
                          {transaction.type}
                        </Badge>
                        <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                          {transaction.status}
                        </Badge>
                        {transaction.vendor && (
                          <span className="text-xs text-muted-foreground">
                            {transaction.vendor}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {transaction.date.toLocaleDateString()} at{' '}
                            {transaction.date.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className={`font-medium ${
                                transaction.type === 'payment' ? 'text-destructive' : 'text-foreground'
                              }`}>
                                {transaction.type === 'payment' ? '-' : ''}
                                {formatCurrency(Math.abs(transaction.amount))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};