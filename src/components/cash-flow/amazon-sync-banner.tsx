import { Loader2, Clock } from "lucide-react";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";

const calculateEstimatedTime = (progress: number) => {
  // Amazon rate limit: 0.5 req/sec = 2 seconds per page minimum
  // With retries and backoff, average ~4-5 seconds per page
  const avgSecondsPerPage = 4.5;
  const remainingProgress = 100 - progress;
  const estimatedMinutes = Math.ceil((remainingProgress * avgSecondsPerPage) / 60);
  
  if (estimatedMinutes < 1) return "Less than 1 minute";
  if (estimatedMinutes < 60) return `~${estimatedMinutes} minutes`;
  
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  return `~${hours}h ${mins}m`;
};

export const AmazonSyncBanner = () => {
  const { amazonAccounts } = useAmazonAccounts();
  
  const syncingAccounts = amazonAccounts.filter(acc => acc.sync_status === 'syncing');
  
  if (syncingAccounts.length === 0) return null;
  
  return (
    <div className="p-4 rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950 mb-6">
      <div className="flex items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {syncingAccounts.map(account => {
            const estimatedTime = account.sync_progress !== undefined && account.sync_progress > 0 
              ? calculateEstimatedTime(account.sync_progress)
              : null;
            
            return (
              <div key={account.id} className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                  Syncing Amazon: {account.account_name}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-200">
                  {account.sync_message || 'Fetching data from Amazon...'}
                </p>
                
                {/* Rate limit notice */}
                <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-300 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>Rate limited by Amazon API (0.5 requests/sec)</span>
                </div>
                
                {account.sync_progress !== undefined && account.sync_progress > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {account.sync_progress}%
                      </span>
                      {estimatedTime && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {estimatedTime} remaining
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${account.sync_progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
