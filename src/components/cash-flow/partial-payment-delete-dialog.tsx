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
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle } from "lucide-react";

interface PartialPaymentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionDescription: string;
  remainingAmount: number;
  paidAmount: number;
  totalAmount: number;
  onDeleteRemaining: () => void;
  onReverseAll: () => void;
}

export const PartialPaymentDeleteDialog = ({
  open,
  onOpenChange,
  transactionDescription,
  remainingAmount,
  paidAmount,
  totalAmount,
  onDeleteRemaining,
  onReverseAll,
}: PartialPaymentDeleteDialogProps) => {
  const baseDescription = transactionDescription.replace('.2', '');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Delete Partially Paid Transaction
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="font-semibold text-foreground">
                Transaction: {baseDescription}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Amount</div>
                  <div className="font-semibold text-foreground">
                    ${totalAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Already Paid</div>
                  <div className="font-semibold text-success">
                    ${paidAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Remaining Balance</div>
                  <div className="font-semibold text-foreground">
                    ${remainingAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-foreground">
              This transaction has been partially paid. Choose how to proceed:
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">
                    Option 1: Delete Remaining Balance Only
                  </div>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  • Removes the ${remainingAmount.toLocaleString()} balance you haven't paid yet
                </div>
                <div className="text-sm text-muted-foreground">
                  • Keeps the ${paidAmount.toLocaleString()} payment record intact
                </div>
                <div className="text-sm text-muted-foreground">
                  • Updates original transaction to show it's fully resolved
                </div>
                <div className="text-sm text-muted-foreground">
                  • Reverts credit card balance only for the ${remainingAmount.toLocaleString()} unpaid portion
                </div>
              </div>

              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">
                    Option 2: Reverse Entire Partial Payment
                  </div>
                  <Badge variant="destructive">Complete Reversal</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  • Completely undoes the partial payment
                </div>
                <div className="text-sm text-muted-foreground">
                  • Removes both the ${paidAmount.toLocaleString()} paid and ${remainingAmount.toLocaleString()} remaining portions
                </div>
                <div className="text-sm text-muted-foreground">
                  • Restores the original ${totalAmount.toLocaleString()} transaction as pending
                </div>
                <div className="text-sm text-muted-foreground">
                  • Fully reverts all credit card balance changes (${totalAmount.toLocaleString()})
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDeleteRemaining}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Delete Remaining Balance
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onReverseAll}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reverse Entire Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
