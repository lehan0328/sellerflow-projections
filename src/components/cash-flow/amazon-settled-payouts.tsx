import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AmazonSettledPayoutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AmazonSettledPayouts = ({ open, onOpenChange }: AmazonSettledPayoutsProps) => {
  const { amazonPayouts, isLoading } = useAmazonPayouts();
  
  // Check if user has any daily settlement accounts
  const hasDailyAccount = amazonPayouts.some(p => p.payout_type === 'daily');

  // For daily accounts, only show confirmed payouts (hide open settlements to avoid double counting)
  // For bi-weekly accounts, show both confirmed and estimated
  const settledPayouts = amazonPayouts.filter(p => {
    if (hasDailyAccount && p.payout_type === 'daily') {
      // Daily accounts: only show confirmed (hide open settlements)
      return p.status === 'confirmed';
    }
    // Bi-weekly accounts: show both confirmed and estimated
    return p.status === 'confirmed' || p.status === 'estimated';
  }).sort((a, b) => new Date(b.payout_date).getTime() - new Date(a.payout_date).getTime());

  const confirmedPayouts = settledPayouts.filter(p => p.status === 'confirmed');
  const estimatedPayouts = settledPayouts.filter(p => p.status === 'estimated');

  const totalConfirmed = confirmedPayouts.reduce((sum, p) => sum + p.total_amount, 0);
  const totalEstimated = estimatedPayouts.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Amazon Settlement History
          </DialogTitle>
          <DialogDescription>
            Actual payouts confirmed and pending from Amazon
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading settlements...</span>
          </div>
        ) : settledPayouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No settlement history available yet
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className={`grid ${estimatedPayouts.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Confirmed</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-lg font-bold text-green-600 mt-1">
                  ${totalConfirmed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{confirmedPayouts.length} payouts</p>
              </div>

              {estimatedPayouts.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Open Settlement</span>
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    ${totalEstimated.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{estimatedPayouts.length} pending</p>
                </div>
              )}
            </div>

            {/* Payout List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {settledPayouts.map((payout) => {
                  const isConfirmed = payout.status === 'confirmed';
                  const date = new Date(payout.payout_date);
                  
                  return (
                    <div 
                      key={payout.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              isConfirmed
                                ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                                : 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {isConfirmed ? 'Confirmed' : 'Open Settlement'}
                            </span>
                            {payout.payout_type && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {payout.payout_type}
                              </span>
                            )}
                          </div>
                          
                <p className="text-sm font-medium truncate">
                  Settlement ID: {payout.settlement_id}
                </p>
                          
                          {payout.amazon_accounts && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {payout.amazon_accounts.account_name} • {payout.marketplace_name}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(date, 'MMMM dd, yyyy')}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-xl font-bold ${
                            isConfirmed ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            ${payout.total_amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payout.currency_code}
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
