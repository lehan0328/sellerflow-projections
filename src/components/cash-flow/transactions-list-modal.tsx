import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { TrendingUp, Calendar, DollarSign, Building2, Users } from "lucide-react";

interface TransactionItem {
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  date: Date;
  description?: string;
  source?: string;
  vendorName?: string;
  customerName?: string;
  id?: string;
}

interface TransactionsListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: TransactionItem[];
  title: string;
  type: 'incoming' | 'upcoming';
}

export function TransactionsListModal({
  open,
  onOpenChange,
  transactions,
  title,
  type
}: TransactionsListModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (transaction: TransactionItem) => {
    switch (transaction.type) {
      case 'inflow':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'purchase-order':
        return <Building2 className="h-4 w-4 text-amber-600" />;
      case 'credit-payment':
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      default:
        return <Calendar className="h-4 w-4 text-slate-600" />;
    }
  };

  const getTransactionLabel = (transaction: TransactionItem) => {
    switch (transaction.type) {
      case 'inflow':
        return 'Income';
      case 'purchase-order':
        return 'Purchase Order';
      case 'credit-payment':
        return 'Credit Payment';
      case 'outflow':
        return 'Expense';
      default:
        return 'Payment';
    }
  };

  const getTransactionDescription = (transaction: TransactionItem) => {
    if (transaction.description) return transaction.description;
    if (transaction.vendorName) return transaction.vendorName;
    if (transaction.customerName) return transaction.customerName;
    if (transaction.source) return transaction.source;
    return 'No description';
  };

  const totalAmount = transactions.reduce((sum, tx) => {
    // Inflows are positive, everything else (outflows, credit payments, purchase orders) are negative
    return sum + (tx.type === 'inflow' ? tx.amount : -tx.amount);
  }, 0);

  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary" className="text-sm">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-lg border ${
            type === 'incoming' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Total Amount</span>
              <span className={`text-2xl font-bold ${
                type === 'incoming' ? 'text-green-700' : 'text-amber-700'
              }`}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Transaction List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {sortedTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No transactions found in this period
                </div>
              ) : (
                sortedTransactions.map((transaction, index) => (
                  <div
                    key={`${transaction.id || ''}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 rounded-full bg-slate-100">
                        {getTransactionIcon(transaction)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {getTransactionDescription(transaction)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {getTransactionLabel(transaction)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-sm font-semibold ${
                        transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'inflow' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
