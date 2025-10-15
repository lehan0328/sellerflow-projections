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
import { CreditCard, Calendar } from "lucide-react";

interface UpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  planName: string;
  amount: number;
  isYearly?: boolean;
  cardLast4?: string;
  cardBrand?: string;
}

export function UpgradeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  planName,
  amount,
  isYearly = false,
  cardLast4,
  cardBrand,
}: UpgradeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">Confirm Upgrade</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-left pt-2">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Plan:</span>
                <span className="text-sm font-semibold text-foreground">{planName}</span>
              </div>
              {isYearly && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Billing:</span>
                  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Calendar className="h-3 w-3" />
                    Yearly
                  </div>
                </div>
              )}
              {cardLast4 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Payment Method:</span>
                  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <CreditCard className="h-3 w-3" />
                    {cardBrand?.toUpperCase()} •••• {cardLast4}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-foreground">Amount Due:</span>
                <span className="text-lg font-bold text-primary">
                  ${(amount / 100).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              {cardLast4 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CreditCard className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-semibold mb-1">Payment Method</p>
                    <p>{cardBrand?.toUpperCase()} ending in {cardLast4}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-semibold mb-1">Your card will be charged immediately</p>
                  <p>Stripe will create an invoice and charge the prorated amount to your card on file.</p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary">
            {cardLast4 ? 'Pay Now' : 'Continue to Checkout'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
