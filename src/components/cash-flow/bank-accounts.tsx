import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, MoreVertical, Settings, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ManualBankAccountDialog } from "./manual-bank-account-dialog";
import { PlaidAccountConfirmationDialog } from "./plaid-account-confirmation-dialog";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BankAccounts({ useAvailableBalance, onToggleBalance }: { useAvailableBalance?: boolean; onToggleBalance?: (value: boolean) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts, isLoading, totalBalance, refetch } = useBankAccounts();
  const { isOverBankLimit, currentUsage, planLimits } = usePlanLimits();
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<string>("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showBalanceConfirmation, setShowBalanceConfirmation] = useState(false);
  const [pendingBalanceToggle, setPendingBalanceToggle] = useState<boolean | null>(null);
  const [localUseActualBalance, setLocalUseActualBalance] = useState(() => {
    const saved = localStorage.getItem('useAvailableBalance');
    return saved !== null ? saved !== 'true' : false; // Default to false (use available balance)
  });
  const [plaidMetadata, setPlaidMetadata] = useState<any>(null);
  const [plaidPublicToken, setPlaidPublicToken] = useState<string | null>(null);
  const [showPlaidConfirmation, setShowPlaidConfirmation] = useState(false);

  // Use prop value if provided, otherwise use local state
  const useActualBalance = useAvailableBalance === undefined ? localUseActualBalance : !useAvailableBalance;
  
  const handleToggle = (checked: boolean) => {
    setPendingBalanceToggle(checked);
    setShowBalanceConfirmation(true);
  };

  const confirmToggle = () => {
    if (pendingBalanceToggle !== null) {
      if (onToggleBalance) {
        onToggleBalance(!pendingBalanceToggle);
      } else {
        setLocalUseActualBalance(pendingBalanceToggle);
      }
    }
    setShowBalanceConfirmation(false);
    setPendingBalanceToggle(null);
  };

  // Calculate available balance total
  const totalAvailableBalance = accounts.reduce((sum, account) => {
    return sum + (account.available_balance ?? account.balance);
  }, 0);

  const displayBalance = useActualBalance ? totalBalance : totalAvailableBalance;

  const config = {
    token: linkToken,
    onSuccess: (publicToken: string, metadata: any) => {
      console.log('Plaid onSuccess - showing confirmation dialog', metadata);
      setPlaidPublicToken(publicToken);
      setPlaidMetadata(metadata);
      setShowPlaidConfirmation(true);
      setLinkToken(null);
      setIsConnecting(false);
    },
    onExit: (err: any) => {
      if (err) {
        console.error('Plaid Link error:', err);
        toast.error("Failed to connect account");
      }
      setLinkToken(null);
      setIsConnecting(false);
    }
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleConnectPlaid = async () => {
    if (!user) {
      toast.error("Please log in to connect a bank account");
      return;
    }

    // Check if user is at or over their bank connection limit
    if (isOverBankLimit) {
      setShowLimitModal(true);
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId: user.id }
      });

      if (error) throw error;
      
      setLinkToken(data.link_token);
    } catch (error: any) {
      console.error('Error creating link token:', error);
      toast.error(error.message || "Failed to initialize bank connection");
      setIsConnecting(false);
    }
  };

  const handleSyncTransactions = async (accountId: string, stripeAccountId: string) => {
    setSyncingAccounts(prev => new Set(prev).add(accountId));
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-transactions', {
        body: { 
          accountId: stripeAccountId, 
          bankAccountId: accountId 
        }
      });

      if (error) throw error;

      toast.success(`Synced ${data.total} transactions (${data.inserted} new, ${data.updated} updated)`);
    } catch (error: any) {
      console.error('Error syncing transactions:', error);
      toast.error("Failed to sync transactions: " + error.message);
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountToDelete);

      if (error) throw error;

      toast.success("Bank account deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingAccount(null);
    }
  };

  const handleBalanceEdit = (accountId: string, currentBalance: number) => {
    setEditingBalanceId(accountId);
    setNewBalance(currentBalance.toString());
  };

  const handleBalanceUpdate = async (accountId: string) => {
    try {
      const balanceValue = parseFloat(newBalance);
      if (isNaN(balanceValue)) {
        toast.error("Please enter a valid number");
        return;
      }

      const { error } = await supabase
        .from('bank_accounts')
        .update({ balance: balanceValue })
        .eq('id', accountId);

      if (error) throw error;

      toast.success("Balance updated successfully");
      setEditingBalanceId(null);
      refetch();
    } catch (error: any) {
      console.error("Error updating balance:", error);
      toast.error(error.message || "Failed to update balance");
    }
  };

  const handleCancelBalanceEdit = () => {
    setEditingBalanceId(null);
    setNewBalance("");
  };

  const isManualAccount = (account: any) => {
    return !account.plaid_account_id || account.plaid_account_id === '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getBalanceVariant = (balance: number) => {
    if (balance > 10000) return "default";
    if (balance > 1000) return "secondary";
    return "destructive";
  };

  const handleConfirmPlaidAccounts = async (selectedAccountIds: string[], priorities?: Record<string, number>) => {
    if (!plaidPublicToken || !plaidMetadata) return;
    
    try {
      console.log('Exchanging Plaid token with selected accounts:', selectedAccountIds);
      const { error } = await supabase.functions.invoke('exchange-plaid-token', {
        body: { 
          publicToken: plaidPublicToken, 
          metadata: plaidMetadata,
          selectedAccountIds,
          priorities
        }
      });
      
      if (error) throw error;
      
      toast.success("Bank accounts connected!");
      
      // Trigger initial transaction sync for the newly connected account(s)
      toast.info("Syncing transactions...", { duration: 3000 });
      const selectedAccounts = plaidMetadata.accounts.filter((acc: any) => 
        selectedAccountIds.includes(acc.id)
      );
      
      for (const account of selectedAccounts) {
        try {
          await supabase.functions.invoke('sync-plaid-transactions', {
            body: { 
              accountId: account.id,
              isInitialSync: true,
              accountType: 'bank'
            }
          });
        } catch (syncError) {
          console.error('Initial sync error for account:', account.id, syncError);
        }
      }
      toast.success("Transactions synced!");
      
      refetch();
      setShowPlaidConfirmation(false);
      setPlaidPublicToken(null);
      setPlaidMetadata(null);
    } catch (error: any) {
      console.error('Error exchanging token:', error);
      toast.error(error.message || "Failed to connect account");
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      toast.info("Checking for duplicate accounts...");
      
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-accounts');
      
      if (error) throw error;
      
      if (data.actions && data.actions.length > 0) {
        toast.success(`Cleanup complete: ${data.actions.join(', ')}`);
        await refetch();
      } else {
        toast.info("No duplicate accounts found");
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast.error("Cleanup failed: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-muted-foreground ml-2">Loading accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bank Accounts</CardTitle>
            <span className="text-xs text-muted-foreground ml-2">• Syncs every 3 hours</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <div className="flex items-center gap-1">
                <Label htmlFor="balance-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  Available
                </Label>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  Recommended
                </Badge>
              </div>
              <Switch
                id="balance-toggle"
                checked={useActualBalance}
                onCheckedChange={handleToggle}
              />
              <Label htmlFor="balance-toggle" className="text-xs text-muted-foreground cursor-pointer">
                Current
              </Label>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(displayBalance)}
              </p>
            </div>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleConnectPlaid}
              disabled={isConnecting}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isConnecting ? "Connecting..." : "Connect Account"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No bank accounts connected</p>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleConnectPlaid}
              disabled={isConnecting}
              className="mt-2"
            >
              {isConnecting ? "Connecting..." : "Connect Your First Account"}
            </Button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold">{account.account_name}</h4>
                  {isManualAccount(account) && (
                    <Badge variant="secondary" className="text-xs">
                      Manual
                    </Badge>
                  )}
                  {account.account_number && (
                    <Badge variant="outline" className="text-xs">
                      {account.account_number}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Last sync: {new Date(account.last_sync).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  {editingBalanceId === account.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="w-32 px-2 py-1 text-right border rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleBalanceUpdate(account.id);
                          if (e.key === 'Escape') handleCancelBalanceEdit();
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleBalanceUpdate(account.id)}>
                        ✓
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelBalanceEdit}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">
                          {formatCurrency(account.available_balance ?? account.balance)}
                        </p>
                        {isManualAccount(account) && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleBalanceEdit(account.id, account.balance)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {account.available_balance !== null && account.available_balance !== undefined 
                            ? `Current: ${formatCurrency(account.balance)}`
                            : 'Available balance'}
                        </p>
                      </div>
                    </div>
                  )}
                  <Badge variant={getBalanceVariant(account.balance)} className="text-xs mt-1">
                    {account.account_type}
                  </Badge>
                </div>
                {/* Show sync button for Stripe-connected accounts */}
                {account.plaid_account_id && account.plaid_account_id.startsWith('fca_') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSyncTransactions(account.id, account.plaid_account_id!)}
                    disabled={syncingAccounts.has(account.id)}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${syncingAccounts.has(account.id) ? 'animate-spin' : ''}`} />
                    {syncingAccounts.has(account.id) ? 'Syncing...' : 'Sync'}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isManualAccount(account) && (
                      <DropdownMenuItem onClick={() => handleEdit(account)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Account
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => {
                        setAccountToDelete(account.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}

        <ManualBankAccountDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          account={editingAccount}
          onSuccess={refetch}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this bank account? This will delete all associated transactions and update available cash, which will affect your forecasting. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Balance Toggle Confirmation */}
        <AlertDialog open={showBalanceConfirmation} onOpenChange={setShowBalanceConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Balance Calculation</AlertDialogTitle>
              <AlertDialogDescription>
                Toggling this setting will change all calculations throughout the app.
                <div className="mt-4 space-y-2">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                      Available Balance (Recommended)
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Includes pending transactions and provides the most accurate view of funds you can actually use.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                      Current Balance
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Does not include pending transactions. May show funds that are not yet available for spending.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingBalanceToggle(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmToggle}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bank Connection Limit Reached</DialogTitle>
              <DialogDescription>
                You've reached your plan's limit of {planLimits?.bankConnections || 0} bank account connections.
                You currently have {currentUsage.bankConnections} account(s) connected.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                To connect more bank accounts, please upgrade your plan or disconnect an existing account.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => navigate('/pricing')}>
                View Plans
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PlaidAccountConfirmationDialog
          open={showPlaidConfirmation}
          onOpenChange={setShowPlaidConfirmation}
          accounts={plaidMetadata?.accounts || []}
          institutionName={plaidMetadata?.institution?.name || ''}
          onConfirm={handleConfirmPlaidAccounts}
        />
      </CardContent>
    </Card>
  );
}