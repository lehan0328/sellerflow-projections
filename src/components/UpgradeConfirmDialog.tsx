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
                <span className="text-sm font-medium text-foreground">Next Billing Amount:</span>
                <span className="text-lg font-bold text-primary">
                  ${(amount / 100).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-amber-600 dark:text-amber-400 mt-0.5">⚡</div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <div className="font-semibold mb-1">Immediate upgrade with automatic billing</div>
                  <div>Your card will be charged ${(amount / 100).toFixed(2)} immediately. You'll receive credit for unused time on your current plan, and your new plan starts right away.</div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary">
            Confirm Upgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
