import { Loader2 } from "lucide-react";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";

export const AmazonSyncBanner = () => {
  const { amazonAccounts } = useAmazonAccounts();
  
  const syncingAccounts = amazonAccounts.filter(acc => acc.sync_status === 'syncing');
  
  if (syncingAccounts.length === 0) return null;
  
  return (
    <div className="p-4 rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950 mb-6">
      <div className="flex items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {syncingAccounts.map(account => (
            <div key={account.id} className="space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                Syncing Amazon: {account.account_name}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200">
                {account.sync_message || 'Fetching data from Amazon...'}
              </p>
              {account.sync_progress !== undefined && account.sync_progress > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {account.sync_progress}%
                    </span>
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
          ))}
        </div>
      </div>
    </div>
  );
};
