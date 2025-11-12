import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, CreditCard, AlertCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePlanLimits } from "@/hooks/usePlanLimits";

interface PlaidAccount {
  id: string; // Plaid uses 'id' not 'account_id'
  name: string;
  type: string;
  subtype: string;
  institution_name?: string;
  balances: {
    current: number;
    limit?: number;
    available?: number;
  };
}

interface PlaidAccountConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: PlaidAccount[];
  institutionName: string;
  onConfirm: (selectedAccounts: string[], priorities: Record<string, number>) => Promise<void>;
}

export function PlaidAccountConfirmationDialog({
  open,
  onOpenChange,
  accounts,
  institutionName,
  onConfirm,
}: PlaidAccountConfirmationDialogProps) {
  const { planLimits, currentUsage, isInTrial } = usePlanLimits();
  
  // Generate stable unique IDs for each account
  const accountsWithIds = accounts.map((acc, index) => ({
    ...acc,
    uniqueId: acc.id || `temp-account-${index}-${acc.name.replace(/\s/g, '-')}`
  }));

  // Initialize with empty selection
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Auto-select all accounts when dialog opens
  useEffect(() => {
    if (open && accountsWithIds.length > 0) {
      const allAccountIds = new Set(accountsWithIds.map(acc => acc.uniqueId));
      setSelectedAccountIds(allAccountIds);
    }
  }, [open, accounts]);
  
  // Calculate remaining connections
  const remainingConnections = planLimits.bankConnections - currentUsage.bankConnections;
  const willExceedLimit = !isInTrial && (selectedAccountIds.size > remainingConnections);

  // Debug logging
  console.log('PlaidAccountConfirmationDialog - Accounts:', accountsWithIds.map(acc => ({
    id: acc.id,
    uniqueId: acc.uniqueId,
    name: acc.name,
    type: acc.type
  })));
  console.log('PlaidAccountConfirmationDialog - Selected IDs:', Array.from(selectedAccountIds));
  console.log('PlaidAccountConfirmationDialog - Priorities:', priorities);

  const isCreditCard = (account: PlaidAccount & { uniqueId: string }) => 
    account.type === 'credit' || account.subtype === 'credit card' || account.subtype === 'credit';

  const toggleAccount = (uniqueId: string) => {
    console.log('toggleAccount called with:', uniqueId);
    const newSelected = new Set(selectedAccountIds);
    if (newSelected.has(uniqueId)) {
      newSelected.delete(uniqueId);
      // Remove priority if deselected
      const newPriorities = { ...priorities };
      delete newPriorities[uniqueId];
      setPriorities(newPriorities);
    } else {
      newSelected.add(uniqueId);
    }
    console.log('New selected set:', Array.from(newSelected));
    setSelectedAccountIds(newSelected);
  };

  const cyclePriority = (uniqueId: string) => {
    const currentPriority = priorities[uniqueId] || 3;
    const nextPriority = currentPriority >= 5 ? 1 : currentPriority + 1;
    setPriorities({ ...priorities, [uniqueId]: nextPriority });
  };

  const handleConfirm = async () => {
    setIsAdding(true);
    try {
      // Map uniqueIds back to actual Plaid account IDs for the API call
      const selectedAccounts = accountsWithIds
        .filter(acc => selectedAccountIds.has(acc.uniqueId))
        .map(acc => acc.id);
      
      console.log('Confirming accounts:', selectedAccounts);
      
      // Map priorities back to Plaid account IDs
      const mappedPriorities: Record<string, number> = {};
      Object.entries(priorities).forEach(([uniqueId, priority]) => {
        const account = accountsWithIds.find(acc => acc.uniqueId === uniqueId);
        if (account?.id) {
          mappedPriorities[account.id] = priority;
        }
      });
      
      console.log('Mapped priorities:', mappedPriorities);
      
      await onConfirm(selectedAccounts, mappedPriorities);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding accounts:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const creditCardAccounts = accountsWithIds.filter(isCreditCard);
  const bankAccounts = accountsWithIds.filter(acc => !isCreditCard(acc));

  // Priority descriptions for tooltips
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return "Highest - Pay first";
      case 2: return "High - Pay second";
      case 3: return "Normal - Standard order";
      case 4: return "Low - Pay later";
      case 5: return "Lowest - Pay last";
      default: return "Normal";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Financial Connections</DialogTitle>
          <DialogDescription>
            Choose which accounts to import from <strong>{institutionName}</strong>. You can select or deselect individual accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Limits Info */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            willExceedLimit 
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
          }`}>
            <Zap className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              willExceedLimit ? 'text-red-600' : 'text-green-600'
            }`} />
            <div className="text-sm flex-1">
              <p className="font-medium mb-1 text-foreground">
                {isInTrial ? 'Trial Mode - Unlimited Connections' : 'Connection Limits'}
              </p>
              {isInTrial ? (
                <p className="text-muted-foreground">
                  You're in trial mode and can connect unlimited accounts. Connect as many as you need to test the platform!
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {remainingConnections > 0 ? (
                    <>
                      You have <strong className="text-foreground">{remainingConnections}</strong> of <strong className="text-foreground">{planLimits.bankConnections}</strong> connections remaining on your <strong className="text-foreground">{planLimits.name}</strong> plan.
                    </>
                  ) : (
                    <>
                      You've used all <strong className="text-foreground">{planLimits.bankConnections}</strong> connections on your <strong className="text-foreground">{planLimits.name}</strong> plan. Upgrade to add more.
                    </>
                  )}
                </p>
              )}
              {willExceedLimit && (
                <p className="mt-2 text-red-700 dark:text-red-300 font-medium">
                  ⚠️ You've selected {selectedAccountIds.size} account{selectedAccountIds.size !== 1 ? 's' : ''}, which exceeds your limit. Please upgrade your plan or select fewer accounts.
                </p>
              )}
            </div>
          </div>

          {/* Bank Limitations Notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-2 text-foreground">Banks with Limited Data</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">American Express</strong> - Often missing payment dates and statement info</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">Capital One</strong> - Missing credit limits and payment dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">Discover</strong> - Limited liabilities data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">Bank of America</strong> - Inconsistent liabilities data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">Chase</strong> - Better coverage but still sometimes incomplete</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
                ⚠️ Plaid does not capture extended spending limits. Manually adjust credit limits after saving if needed.
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground italic">
                You can manually add missing payment dates and statement info after connecting
              </p>
            </div>
          </div>

          {/* Bank Accounts Section */}
          {bankAccounts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Accounts ({bankAccounts.length})
              </h3>
              <div className="space-y-2 border rounded-lg p-2">
                {bankAccounts.map((account) => (
                  <div
                    key={account.uniqueId}
                    className="flex items-center space-x-3 p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`bank-checkbox-${account.uniqueId}`}
                      checked={selectedAccountIds.has(account.uniqueId)}
                      onCheckedChange={() => toggleAccount(account.uniqueId)}
                    />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.subtype}
                      {account.balances?.current != null && ` • Balance: $${account.balances.current.toFixed(2)}`}
                    </p>
                  </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credit Cards Section */}
          {creditCardAccounts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Cards ({creditCardAccounts.length})
              </h3>
              <div className="space-y-2 border rounded-lg p-2">
                {creditCardAccounts.map((account) => {
                  const isSelected = selectedAccountIds.has(account.uniqueId);
                  const priority = priorities[account.uniqueId] || 3;
                  
                  return (
                    <div
                      key={account.uniqueId}
                      className="flex items-center space-x-3 p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`credit-checkbox-${account.uniqueId}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleAccount(account.uniqueId)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{account.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {account.balances?.current != null || account.balances?.available != null || account.balances?.limit != null ? (
                            <span className="flex flex-wrap gap-2">
                              {account.balances?.current != null && (
                                <span>
                                  Balance: <span className="font-medium text-foreground">${account.balances.current.toFixed(2)}</span>
                                </span>
                              )}
                              {account.balances?.available != null && (
                                <span>
                                  • Available: <span className="font-medium text-green-600 dark:text-green-400">${account.balances.available.toFixed(2)}</span>
                                </span>
                              )}
                              {account.balances?.limit != null && (
                                <span>
                                  • Limit: <span className="font-medium text-foreground">${account.balances.limit.toFixed(2)}</span>
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70">Balance details will be synced after connection</span>
                          )}
                        </p>
                      </div>
                      {isSelected && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge 
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all flex items-center gap-1.5 px-3 py-1 select-none"
                            >
                              {priority !== 3 ? (
                                <>Priority: {priority} ▼</>
                              ) : (
                                <>Set Priority ▼</>
                              )}
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-64 p-2 bg-popover border shadow-lg z-[200]" 
                            align="end"
                            sideOffset={5}
                          >
                            <div className="space-y-1">
                              {[1, 2, 3, 4, 5].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Setting priority:', p, 'for account:', account.uniqueId);
                                    setPriorities({ ...priorities, [account.uniqueId]: p });
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    priority === p 
                                      ? 'bg-primary text-primary-foreground font-medium' 
                                      : 'hover:bg-accent hover:text-accent-foreground'
                                  }`}
                                >
                                  <div className="font-semibold">{p} - {getPriorityLabel(p).split(' - ')[0]}</div>
                                  <div className="text-xs opacity-80">{getPriorityLabel(p).split(' - ')[1]}</div>
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 px-1">
                              Set based on favorable terms or cash back rewards
                            </p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedAccountIds.size === 0 || isAdding || willExceedLimit}
          >
            {isAdding ? "Adding..." : willExceedLimit ? "Exceeds Limit" : `Add ${selectedAccountIds.size} Account${selectedAccountIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
