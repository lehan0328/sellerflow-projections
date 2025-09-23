import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Building2, CreditCard, ShoppingCart, Wallet, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  poName?: string;
  date: Date;
}

interface TransactionDetailModalProps {
  transaction: CashFlowEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailModal = ({ transaction, open, onOpenChange }: TransactionDetailModalProps) => {
  if (!transaction) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inflow':
        return <Wallet className="h-5 w-5" />;
      case 'credit-payment':
        return <CreditCard className="h-5 w-5" />;
      case 'purchase-order':
        return <ShoppingCart className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inflow':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400';
      case 'credit-payment':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400';
      case 'purchase-order':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getTypeIcon(transaction.type)}
            <span>Transaction Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Type</span>
            <Badge className={`${getTypeColor(transaction.type)} font-medium`}>
              {getTypeName(transaction.type)}
            </Badge>
          </div>

          <Separator />

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Amount</span>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className={`text-lg font-bold ${
                transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'inflow' ? '+' : '-'}${transaction.amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Date</span>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{format(transaction.date, 'PPP')}</span>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Time</span>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{format(transaction.date, 'p')}</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Description</span>
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="font-medium">{transaction.description}</p>
            </div>
          </div>

          {/* Vendor (if applicable) */}
          {transaction.vendor && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Vendor</span>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{transaction.vendor}</span>
              </div>
            </div>
          )}

          {/* Purchase Order Name (if applicable) */}
          {transaction.poName && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Purchase Order</span>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{transaction.poName}</span>
              </div>
            </div>
          )}

          {/* Credit Card (if applicable) */}
          {transaction.creditCard && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Credit Card</span>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{transaction.creditCard}</span>
              </div>
            </div>
          )}

          {/* Transaction ID */}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Transaction ID</span>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {transaction.id}
            </span>
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