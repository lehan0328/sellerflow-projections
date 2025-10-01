import React, { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BankTransactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accounts, isLoading: accountsLoading } = useBankAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);
  
  const { transactions, isLoading: transactionsLoading, refetch } = useBankTransactions(
    selectedAccountId === "all" ? undefined : selectedAccountId
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const handleSync = async () => {
    if (!selectedAccountId || selectedAccountId === "all") {
      toast({
        title: "Select an account",
        description: "Please select a specific account to sync transactions.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-plaid-transactions', {
        body: { accountId: selectedAccountId, isInitialSync: false },
      });

      if (error) throw error;

      toast({
        title: "Transactions synced",
        description: data.message || "Successfully synced transactions",
      });
      
      refetch();
    } catch (error: any) {
      console.error('Error syncing transactions:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync transactions",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bank Transactions</h1>
            <p className="text-muted-foreground">View and manage your connected bank account transactions</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.institution_name} - {account.account_name} (••{account.account_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleSync} 
            disabled={syncing || selectedAccountId === "all"}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Transactions
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {accountsLoading || transactionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No bank accounts connected yet.</p>
                <Button onClick={() => navigate('/settings')}>
                  Connect Bank Account
                </Button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found. Try syncing your account.
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const account = accounts.find(acc => acc.id === tx.bankAccountId);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tx.merchantName || tx.name}</p>
                          {tx.pending && (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{format(tx.date, 'MMM dd, yyyy')}</span>
                          {account && (
                            <span>{account.institution_name} - {account.account_name}</span>
                          )}
                          {tx.category && tx.category.length > 0 && (
                            <span>{tx.category[0]}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {tx.amount < 0 ? '-' : '+'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {tx.transactionType || tx.paymentChannel}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankTransactions;
