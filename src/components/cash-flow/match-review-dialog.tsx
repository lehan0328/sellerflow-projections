import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import { TransactionMatch } from "@/hooks/useTransactionMatching";

interface MatchReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: TransactionMatch | null;
  onAccept: () => void;
  onReject: () => void;
}

export const MatchReviewDialog = ({
  open,
  onOpenChange,
  match,
  onAccept,
  onReject,
}: MatchReviewDialogProps) => {
  if (!match) return null;

  const isIncome = match.type === 'income';
  const matchedItem = isIncome ? match.matchedIncome : match.matchedVendor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isIncome ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-orange-600" />
            )}
            <span>Confirm Transaction Match</span>
          </DialogTitle>
          <DialogDescription>
            Review the match details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Match Score */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Match Confidence</span>
            <Badge variant="secondary">
              {Math.round(match.matchScore * 100)}% match
            </Badge>
          </div>

          {/* Bank Transaction */}
          <div className="p-4 border rounded-lg bg-accent/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">BANK TRANSACTION</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {match.bankTransaction.merchantName || match.bankTransaction.description}
                </span>
                <span className={`text-sm font-semibold ${
                  match.bankTransaction.amount > 0 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  ${Math.abs(match.bankTransaction.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{match.bankTransaction.date.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{match.bankTransaction.accountName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Matched Item */}
          <div className="p-4 border rounded-lg bg-primary/5">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {isIncome ? 'INCOME ITEM' : 'VENDOR TRANSACTION'}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isIncome ? match.matchedIncome?.description : match.matchedVendor?.name}
                </span>
                <span className={`text-sm font-semibold ${
                  isIncome ? 'text-green-600' : 'text-orange-600'
                }`}>
                  ${isIncome 
                    ? match.matchedIncome?.amount.toLocaleString()
                    : match.matchedVendor?.totalOwed.toLocaleString()
                  }
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {isIncome
                      ? match.matchedIncome?.paymentDate.toLocaleDateString()
                      : 'Vendor payment'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>
                    {isIncome ? match.matchedIncome?.source : 'Purchase order'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> Accepting this match will:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>Archive the bank transaction</li>
                <li>Mark the {isIncome ? 'income' : 'vendor payment'} as completed</li>
                <li>Update your financial records</li>
              </ul>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button onClick={onAccept}>
            Accept Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
