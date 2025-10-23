import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, CreditCard, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  institution_name: string;
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
  // Generate stable unique IDs for each account
  const accountsWithIds = accounts.map((acc, index) => ({
    ...acc,
    uniqueId: acc.account_id || `temp-account-${index}-${acc.name.replace(/\s/g, '-')}`
  }));

  // Initialize with empty selection - user must explicitly select accounts
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Debug logging
  console.log('PlaidAccountConfirmationDialog - Accounts:', accountsWithIds.map(acc => ({
    id: acc.account_id,
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

  const toggleExpanded = (uniqueId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(uniqueId)) {
      newExpanded.delete(uniqueId);
    } else {
      newExpanded.add(uniqueId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleConfirm = async () => {
    setIsAdding(true);
    try {
      // Map uniqueIds back to actual account_ids for the API call
      const selectedAccounts = accountsWithIds
        .filter(acc => selectedAccountIds.has(acc.uniqueId))
        .map(acc => acc.account_id);
      
      // Map priorities back to account_ids
      const mappedPriorities: Record<string, number> = {};
      Object.entries(priorities).forEach(([uniqueId, priority]) => {
        const account = accountsWithIds.find(acc => acc.uniqueId === uniqueId);
        if (account?.account_id) {
          mappedPriorities[account.account_id] = priority;
        }
      });
      
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
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Review before connecting</p>
              <p className="text-blue-700 dark:text-blue-300">
                Select which accounts to connect and set credit card payment priorities.
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
                  const isExpanded = expandedAccounts.has(account.uniqueId);
                  const isSelected = selectedAccountIds.has(account.uniqueId);
                  
                  return (
                    <div
                      key={account.uniqueId}
                      className="border rounded-md bg-card overflow-hidden"
                    >
                      <div className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={`credit-checkbox-${account.uniqueId}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleAccount(account.uniqueId)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.balances?.current != null && `Balance: $${account.balances.current.toFixed(2)}`}
                            {account.balances?.current != null && account.balances?.limit != null && ' • '}
                            {account.balances?.limit != null && `Limit: $${account.balances.limit.toFixed(2)}`}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge 
                            variant={priorities[account.uniqueId] ? "secondary" : "outline"}
                            className="cursor-pointer hover:bg-secondary/80 transition-colors"
                            onClick={() => toggleExpanded(account.uniqueId)}
                          >
                            Priority: {priorities[account.uniqueId] || 3} {isExpanded ? '▼' : '▶'}
                          </Badge>
                        )}
                      </div>
                      
                      {isSelected && isExpanded && (
                        <div className="p-4 pt-0 space-y-3 bg-muted/30">
                          <div className="space-y-2">
                            <Label htmlFor={`priority-${account.uniqueId}`} className="text-xs">
                              Payment Priority
                            </Label>
                            <Select
                              key={`priority-select-${account.uniqueId}`}
                              value={String(priorities[account.uniqueId] || 3)}
                              onValueChange={(value) => 
                                setPriorities({ ...priorities, [account.uniqueId]: parseInt(value) })
                              }
                            >
                              <SelectTrigger id={`priority-trigger-${account.uniqueId}`} className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">
                                  <div className="flex flex-col items-start">
                                    <span className="font-semibold text-xs">1 - Highest</span>
                                    <span className="text-xs text-muted-foreground">Pay first</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="2">
                                  <div className="flex flex-col items-start">
                                    <span className="font-semibold text-xs">2 - High</span>
                                    <span className="text-xs text-muted-foreground">Pay second</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="3">
                                  <div className="flex flex-col items-start">
                                    <span className="font-semibold text-xs">3 - Normal</span>
                                    <span className="text-xs text-muted-foreground">Standard order</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="4">
                                  <div className="flex flex-col items-start">
                                    <span className="font-semibold text-xs">4 - Low</span>
                                    <span className="text-xs text-muted-foreground">Pay later</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="5">
                                  <div className="flex flex-col items-start">
                                    <span className="font-semibold text-xs">5 - Lowest</span>
                                    <span className="text-xs text-muted-foreground">Pay last</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Set based on favorable terms or cash back rewards
                            </p>
                          </div>
                        </div>
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
            disabled={selectedAccountIds.size === 0 || isAdding}
          >
            {isAdding ? "Adding..." : `Add ${selectedAccountIds.size} Account${selectedAccountIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
