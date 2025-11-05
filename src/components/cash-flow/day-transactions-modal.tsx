import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Building2, CreditCard, ShoppingCart, Wallet, FileText } from "lucide-react";
import { format } from "date-fns";

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  poName?: string;
  source?: string;
  date: Date;
}

interface DayTransactionsModalProps {
  transactions: CashFlowEvent[];
  date: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DayTransactionsModal = ({ transactions, date, open, onOpenChange }: DayTransactionsModalProps) => {
  if (!transactions || transactions.length === 0 || !date) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inflow':
        return <Wallet className="h-4 w-4" />;
      case 'credit-payment':
        return <CreditCard className="h-4 w-4" />;
      case 'purchase-order':
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inflow':
        return 'bg-finance-positive/20 text-finance-positive border-finance-positive/30';
      case 'credit-payment':
        return 'bg-warning/20 text-warning-foreground border-warning/30';
      case 'purchase-order':
        return 'bg-primary/20 text-primary border-primary/30';
      default:
        return 'bg-finance-negative/20 text-finance-negative border-finance-negative/30';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'inflow':
        return 'Cash Inflow';
      case 'credit-payment':
        return 'Credit Card Payment';
      case 'purchase-order':
        return 'Purchase Order';
      case 'outflow':
        return 'Cash Outflow';
      default:
        return 'Transaction';
    }
  };

  const totalInflow = transactions
    .filter(t => t.type === 'inflow')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalOutflow = transactions
    .filter(t => t.type !== 'inflow')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netAmount = totalInflow - totalOutflow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Transactions for {format(date, 'PPPP')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Inflow</div>
              <div className="text-lg font-bold text-finance-positive">
                +${totalInflow.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Outflow</div>
              <div className="text-lg font-bold text-finance-negative">
                -${totalOutflow.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Net Amount</div>
              <div className={`text-lg font-bold ${netAmount >= 0 ? 'text-finance-positive' : 'text-finance-negative'}`}>
                {netAmount >= 0 ? '+' : ''}${netAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction List */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              {transactions.length} Transaction{transactions.length > 1 ? 's' : ''}
            </div>
            
            {transactions.map((transaction, index) => (
              <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                {/* Transaction Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(transaction.type)}
                    <Badge className={`${getTypeColor(transaction.type)} font-medium`}>
                      {getTypeName(transaction.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-lg font-bold ${
                      transaction.type === 'inflow' ? 'text-finance-positive' : 'text-finance-negative'
                    }`}>
                      {transaction.type === 'inflow' ? '+' : '-'}${transaction.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="font-medium">{transaction.description}</span>
                  </div>

                  {transaction.vendor && (
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Vendor: </span>
                      <span className="text-sm font-medium">{transaction.vendor}</span>
                    </div>
                  )}

                  {transaction.poName && (
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">PO: </span>
                      <span className="text-sm font-medium">{transaction.poName}</span>
                    </div>
                  )}

                  {transaction.creditCard && (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Card: </span>
                      <span className="text-sm font-medium">{transaction.creditCard}</span>
                    </div>
                  )}
                </div>

                {index < transactions.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};