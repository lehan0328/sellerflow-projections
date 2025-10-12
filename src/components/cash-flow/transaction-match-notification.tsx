import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

interface TransactionMatchNotificationProps {
  unmatchedCount: number;
  onDismiss?: () => void;
  onNavigate?: () => void;
}

export const TransactionMatchNotification = ({ 
  unmatchedCount,
  onDismiss,
  onNavigate 
}: TransactionMatchNotificationProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (unmatchedCount === 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleNavigate = () => {
    onNavigate?.();
  };

  return (
    <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800 mb-6">
      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="font-semibold text-orange-900 dark:text-orange-100">
            {unmatchedCount} transaction{unmatchedCount !== 1 ? 's' : ''} need{unmatchedCount === 1 ? 's' : ''} matching
          </span>
          <span className="ml-2 text-orange-700 dark:text-orange-300">
            Review and match bank transactions with your vendors and income
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigate}
            className="bg-white dark:bg-background hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-300 dark:border-orange-700"
          >
            Review Transactions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
