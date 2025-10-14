import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MoreVertical, Settings, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { ManualBankAccountDialog } from "./manual-bank-account-dialog";
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

export function BankAccounts() {
  const navigate = useNavigate();
  const { accounts, isLoading, totalBalance, refetch } = useBankAccounts();
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDialogOpen(true)}
              className="ml-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manual
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/manage-accounts')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Connect Bank
            </Button>
            {accounts.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/transactions')}
              >
                View Transactions
              </Button>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No bank accounts connected</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="mt-2"
            >
              Connect Your First Account
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
                  <p className="font-bold text-lg">
                    {formatCurrency(account.balance)}
                  </p>
                  <Badge variant={getBalanceVariant(account.balance)} className="text-xs">
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
                Are you sure you want to delete this bank account? This action cannot be undone.
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
      </CardContent>
    </Card>
  );
}