import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAmazonTransactions } from "@/hooks/useAmazonTransactions";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface AmazonTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AmazonTransactionHistory = ({ open, onOpenChange }: AmazonTransactionHistoryProps) => {
  const { amazonTransactions, isLoading } = useAmazonTransactions();

  // Group transactions by type
  const orderTransactions = amazonTransactions.filter(t => 
    t.transaction_type?.toLowerCase().includes('order') || 
    t.transaction_type?.toLowerCase().includes('sale')
  );
  
  const feeTransactions = amazonTransactions.filter(t => 
    t.transaction_type?.toLowerCase().includes('fee') ||
    t.transaction_type?.toLowerCase().includes('service')
  );
  
  const refundTransactions = amazonTransactions.filter(t => 
    t.transaction_type?.toLowerCase().includes('refund')
  );

  const totalOrders = orderTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = feeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalRefunds = refundTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Amazon Transaction History</DialogTitle>
          <DialogDescription>
            Historical data used for payout forecasting
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
          </div>
        ) : amazonTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transaction history available yet
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Orders</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-lg font-bold text-green-600 mt-1">
                  ${totalOrders.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{orderTransactions.length} transactions</p>
              </div>

              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Fees</span>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-lg font-bold text-red-600 mt-1">
                  ${totalFees.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{feeTransactions.length} transactions</p>
              </div>

              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Refunds</span>
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                </div>
                <p className="text-lg font-bold text-orange-600 mt-1">
                  ${totalRefunds.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{refundTransactions.length} transactions</p>
              </div>
            </div>

            {/* Transaction List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {amazonTransactions.map((transaction) => {
                  const isPositive = transaction.amount > 0;
                  const date = new Date(transaction.transaction_date);
                  
                  return (
                    <div 
                      key={transaction.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              isPositive 
                                ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                            }`}>
                              {transaction.transaction_type}
                            </span>
                            {transaction.marketplace_name && (
                              <span className="text-xs text-muted-foreground">
                                {transaction.marketplace_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">
                            {transaction.description || transaction.fee_description || 'Amazon Transaction'}
                          </p>
                          {transaction.order_id && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Order: {transaction.order_id}
                            </p>
                          )}
                          {transaction.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {transaction.sku}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(date, 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPositive ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.currency_code}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
