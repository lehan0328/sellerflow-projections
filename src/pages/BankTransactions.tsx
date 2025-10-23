import React, { useState } from "react";
import { ArrowLeft, RefreshCw, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useVendors } from "@/hooks/useVendors";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { useTransactionMatching, TransactionMatch } from "@/hooks/useTransactionMatching";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TransactionMatchButton } from "@/components/cash-flow/transaction-match-button";
import { MatchReviewDialog } from "@/components/cash-flow/match-review-dialog";

const BankTransactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accounts, isLoading: accountsLoading } = useBankAccounts();
  const { creditCards, isLoading: creditCardsLoading } = useCreditCards();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedAccountType, setSelectedAccountType] = useState<'bank' | 'credit'>('bank');
  const [syncing, setSyncing] = useState(false);
  const [matchingAll, setMatchingAll] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<TransactionMatch | null>(null);
  
  const { transactions, isLoading: transactionsLoading, refetch } = useBankTransactions(
    selectedAccountId === "all" ? undefined : selectedAccountId,
    selectedAccountType
  );
  
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  
  // Combine bank accounts and credit cards for selection
  const allAccounts = [
    ...accounts.map(acc => ({ ...acc, accountType: 'bank' as const })),
    ...creditCards.map(card => ({ 
      id: card.id,
      account_name: card.account_name || card.nickname || 'Credit Card',
      institution_name: card.institution_name,
      accountType: 'credit' as const
    }))
  ];
  
  // Transform data for transaction matching
  const bankTransactionsForMatching = transactions.map(tx => ({
    id: tx.id,
    description: tx.name,
    merchantName: tx.merchantName || tx.name,
    amount: tx.amount,
    date: tx.date,
    accountName: allAccounts.find(acc => acc.id === (tx.bankAccountId || tx.creditCardId))?.account_name || '',
    accountId: tx.bankAccountId || tx.creditCardId,
    institutionName: allAccounts.find(acc => acc.id === (tx.bankAccountId || tx.creditCardId))?.institution_name || '',
    type: (tx.amount < 0 ? 'debit' : 'credit') as 'credit' | 'debit',
    status: (tx.pending ? 'pending' : 'posted') as 'pending' | 'posted',
    pending: tx.pending
  }));
  
  const { transactions: vendorTransactions } = useVendorTransactions();
  
  const vendorTransactionsForMatching = vendorTransactions?.filter(tx => tx.status === 'pending').map(tx => ({
    id: tx.id,
    vendorName: tx.vendorName,
    description: tx.description,
    amount: tx.amount,
    dueDate: tx.dueDate,
    status: tx.status,
    category: tx.category
  })) || [];
  
  const incomeItemsForMatching = incomeItems.map(i => ({
    id: i.id,
    description: i.description,
    amount: i.amount,
    paymentDate: i.paymentDate,
    source: i.source || i.description,
    status: i.status,
    customerId: i.customerId
  }));
  
  const { matches } = useTransactionMatching(
    bankTransactionsForMatching,
    vendorTransactionsForMatching,
    incomeItemsForMatching
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
      // Determine account type from selected account
      const selectedAccount = allAccounts.find(acc => acc.id === selectedAccountId);
      const accountType = selectedAccount?.accountType === 'credit' ? 'credit' : 'bank';
      
      const { data, error } = await supabase.functions.invoke('sync-plaid-transactions', {
        body: { 
          accountId: selectedAccountId, 
          isInitialSync: false,
          accountType 
        },
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
  
  const handleMatchAll = async () => {
    setMatchingAll(true);
    try {
      let successCount = 0;
      for (const match of matches) {
        await processMatch(match);
        successCount++;
      }
      
      toast({
        title: "Matches processed",
        description: `Successfully processed ${successCount} transaction matches`,
      });
      
      refetch();
    } catch (error: any) {
      console.error('Error matching transactions:', error);
      toast({
        title: "Match failed",
        description: error.message || "Failed to process some matches",
        variant: "destructive",
      });
    } finally {
      setMatchingAll(false);
    }
  };
  
  const handleReviewMatches = () => {
    if (matches.length === 0) {
      toast({
        title: "No matches",
        description: "No transaction matches found to review",
      });
      return;
    }
    
    setCurrentMatchIndex(0);
    setCurrentMatch(matches[0]);
    setShowReviewDialog(true);
  };
  
  const handleAcceptMatch = async () => {
    if (!currentMatch) return;
    
    try {
      await processMatch(currentMatch);
      
      toast({
        title: "Match accepted",
        description: "Transaction matched successfully",
      });
      
      // Move to next match or close dialog
      const nextIndex = currentMatchIndex + 1;
      if (nextIndex < matches.length) {
        setCurrentMatchIndex(nextIndex);
        setCurrentMatch(matches[nextIndex]);
      } else {
        setShowReviewDialog(false);
        setCurrentMatch(null);
      }
      
      refetch();
    } catch (error: any) {
      console.error('Error accepting match:', error);
      toast({
        title: "Match failed",
        description: error.message || "Failed to process match",
        variant: "destructive",
      });
    }
  };
  
  const handleRejectMatch = () => {
    // Move to next match or close dialog
    const nextIndex = currentMatchIndex + 1;
    if (nextIndex < matches.length) {
      setCurrentMatchIndex(nextIndex);
      setCurrentMatch(matches[nextIndex]);
    } else {
      setShowReviewDialog(false);
      setCurrentMatch(null);
    }
  };
  
  const processMatch = async (match: TransactionMatch) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    if (match.type === 'income') {
      // Update income status to received and archive
      await supabase
        .from('income')
        .update({ status: 'received', archived: true })
        .eq('id', match.matchedIncome!.id);
    } else {
      // Update vendor transaction status to paid and archive
      await supabase
        .from('transactions')
        .update({ status: 'paid', archived: true })
        .eq('id', match.matchedVendorTransaction!.id);
    }
    
    // Archive the bank transaction by storing it and deleting from bank_transactions
    await supabase
      .from('deleted_transactions')
      .insert([{
        user_id: user.id,
        original_id: match.bankTransaction.id,
        name: match.bankTransaction.merchantName || match.bankTransaction.description,
        description: `Matched with ${match.type === 'income' ? match.matchedIncome?.description : match.matchedVendorTransaction?.vendorName}`,
        amount: match.bankTransaction.amount,
        payment_date: match.bankTransaction.date.toISOString().split('T')[0],
        transaction_type: 'bank',
        status: 'matched',
        category: match.type,
        metadata: {
          matchedType: match.type,
          matchedId: match.type === 'income' ? match.matchedIncome?.id : match.matchedVendorTransaction?.id,
          matchScore: match.matchScore
        }
      }]);
    
    await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', match.bankTransaction.id);
  };
  
  const getMatchesForTransaction = (transactionId: string) => {
    return matches.filter(m => m.bankTransaction.id === transactionId);
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
            <h1 className="text-3xl font-bold">Bank & Credit Card Transactions</h1>
            <p className="text-muted-foreground">View and manage your connected account transactions</p>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <Select value={selectedAccountId} onValueChange={(value) => {
            setSelectedAccountId(value);
            // Determine account type based on selected account
            if (value !== "all") {
              const selectedAccount = allAccounts.find(acc => acc.id === value);
              setSelectedAccountType(selectedAccount?.accountType || 'bank');
            }
          }}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.length > 0 && (
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Bank Accounts</div>
              )}
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.institution_name} - {account.account_name}
                </SelectItem>
              ))}
              {creditCards.length > 0 && (
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Credit Cards</div>
              )}
              {creditCards.map(card => (
                <SelectItem key={card.id} value={card.id}>
                  {card.institution_name} - {card.account_name || card.nickname || 'Credit Card'}
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
          
          <div className="flex-1 min-w-[250px]">
            <TransactionMatchButton
              matches={matches}
              onMatchAll={handleMatchAll}
              onReviewMatches={handleReviewMatches}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {accountsLoading || creditCardsLoading || transactionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : allAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No accounts connected yet.</p>
                <Button onClick={() => navigate('/settings')}>
                  Connect Account
                </Button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {selectedAccountId === "all" 
                    ? "No transactions found across any accounts. Select a specific account and sync to import transactions."
                    : "No transactions found for this account."}
                </p>
                {selectedAccountId !== "all" && (
                  <Button onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Transactions Now
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const account = allAccounts.find(acc => acc.id === tx.bankAccountId);
                  const txMatches = getMatchesForTransaction(tx.id);
                  const hasMatches = txMatches.length > 0;
                  
                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                        hasMatches ? 'border-primary/50 bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tx.merchantName || tx.name}</p>
                          {tx.pending && (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                          {hasMatches && (
                            <Badge variant="default" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />
                              {txMatches.length} match{txMatches.length > 1 ? 'es' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{format(tx.date, 'MMM dd, yyyy')}</span>
                          {account && (
                            <>
                              <span>{account.institution_name} - {account.account_name}</span>
                              {account.accountType === 'credit' && (
                                <Badge variant="secondary" className="text-xs">Credit Card</Badge>
                              )}
                            </>
                          )}
                          {tx.category && tx.category.length > 0 && (
                            <span>{tx.category[0]}</span>
                          )}
                          {hasMatches && (
                            <span className="text-primary font-medium">
                              Matches: {txMatches.map(m => 
                                m.type === 'income' ? m.matchedIncome?.description : m.matchedVendorTransaction?.vendorName
                              ).join(', ')}
                            </span>
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
        
        <MatchReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          match={currentMatch}
          onAccept={handleAcceptMatch}
          onReject={handleRejectMatch}
        />
      </div>
    </div>
  );
};

export default BankTransactions;
