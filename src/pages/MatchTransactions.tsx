import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link2, CheckCircle2, XCircle, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useTransactionMatching, TransactionMatch } from "@/hooks/useTransactionMatching";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useVendors } from "@/hooks/useVendors";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";
import { MatchReviewDialog } from "@/components/cash-flow/match-review-dialog";

const MatchTransactions = () => {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<TransactionMatch | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [processingMatches, setProcessingMatches] = useState<Set<string>>(new Set());
  const [showPotentialMatches, setShowPotentialMatches] = useState(false);

  const { accounts } = useBankAccounts();
  const { transactions: bankTransactionsData, refetch: refetchBankTransactions } = useBankTransactions();
  const { vendors } = useVendors();
  const { transactions: vendorTransactions, markAsPaid, refetch: refetchVendorTransactions } = useVendorTransactions();
  const { incomeItems, updateIncome, refetch: refetchIncome } = useIncome();
  const { addTransaction } = useTransactions();

  // Transform data for transaction matching
  const bankTransactions = bankTransactionsData?.map(tx => ({
    id: tx.id,
    description: tx.name,
    merchantName: tx.merchantName || tx.name,
    amount: tx.amount,
    date: tx.date,
    accountName: accounts.find(acc => acc.id === tx.bankAccountId)?.account_name || '',
    accountId: tx.bankAccountId,
    institutionName: accounts.find(acc => acc.id === tx.bankAccountId)?.institution_name || '',
    type: (tx.amount < 0 ? 'debit' : 'credit') as 'credit' | 'debit',
    status: (tx.pending ? 'pending' : 'posted') as 'pending' | 'posted',
    pending: tx.pending
  })) || [];

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

  const { matches, potentialMatches } = useTransactionMatching(
    bankTransactions,
    vendorTransactionsForMatching,
    incomeItemsForMatching
  );

  const displayedMatches = showPotentialMatches ? potentialMatches : matches;

  const handleReviewMatch = (match: TransactionMatch) => {
    setSelectedMatch(match);
    setShowReviewDialog(true);
  };

  const handleAcceptMatch = async (match: TransactionMatch) => {
    setProcessingMatches(prev => new Set(prev).add(match.bankTransaction.id));
    
    try {
      if (match.type === 'income' && match.matchedIncome) {
        await updateIncome(match.matchedIncome.id, { status: 'received' });
        await addTransaction({
          type: 'customer_payment',
          amount: match.matchedIncome.amount,
          description: `Matched: ${match.matchedIncome.source} - ${match.matchedIncome.description}`,
          customerId: match.matchedIncome.customerId,
          transactionDate: new Date(),
          status: 'completed'
        });
        
        toast({
          title: 'Income matched',
          description: 'Income has been matched with bank transaction.',
        });
      } else if (match.type === 'vendor' && match.matchedVendorTransaction) {
        await markAsPaid(match.matchedVendorTransaction.id);
        
        toast({
          title: 'Vendor payment matched',
          description: 'Vendor payment has been matched with bank transaction.',
        });
      }
      
      await Promise.all([refetchIncome(), refetchVendorTransactions(), refetchBankTransactions()]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to match transaction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingMatches(prev => {
        const next = new Set(prev);
        next.delete(match.bankTransaction.id);
        return next;
      });
      setShowReviewDialog(false);
      setSelectedMatch(null);
    }
  };

  const handleRejectMatch = () => {
    setShowReviewDialog(false);
    setSelectedMatch(null);
  };

  const handleMatchAll = async () => {
    for (const match of matches) {
      await handleAcceptMatch(match);
    }
  };

  // Group matches by transaction
  const groupedMatches = displayedMatches.reduce((acc, match) => {
    const txId = match.bankTransaction.id;
    if (!acc[txId]) {
      acc[txId] = [];
    }
    acc[txId].push(match);
    return acc;
  }, {} as Record<string, TransactionMatch[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Match Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve potential transaction matches between your bank transactions and income/expenses
          </p>
        </div>
        <div className="flex items-center gap-3">
          {potentialMatches.length > 0 && (
            <Button 
              onClick={() => setShowPotentialMatches(!showPotentialMatches)} 
              variant={showPotentialMatches ? "default" : "outline"}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Potential Matches ({potentialMatches.length})
            </Button>
          )}
          {displayedMatches.length > 0 && (
            <Button onClick={handleMatchAll} size="lg">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Match All ({displayedMatches.length})
            </Button>
          )}
        </div>
      </div>

      {displayedMatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {showPotentialMatches ? (
              <>
                <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Potential Matches Found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  There are no transactions with exact amounts but different names.
                </p>
              </>
            ) : (
              <>
                <Link2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Matches Found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  There are currently no potential matches between your bank transactions and income/expenses.
                  Matches will appear here automatically when the system detects similar transactions.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMatches).map(([txId, txMatches]) => {
            const topMatch = txMatches[0];
            const isProcessing = processingMatches.has(txId);
            
            return (
              <Card key={txId} className={showPotentialMatches ? "border-yellow-500/50 bg-yellow-500/5" : "border-green-500/50 bg-green-500/5"}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {showPotentialMatches ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <Link2 className="h-5 w-5 text-green-600" />
                        )}
                        {topMatch.bankTransaction.merchantName || topMatch.bankTransaction.description}
                        <Badge variant="secondary" className="ml-2">
                          {Math.round(topMatch.matchScore * 100)}% Match
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {topMatch.bankTransaction.type === 'debit' ? '-' : '+'}
                            ${Math.abs(topMatch.bankTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span>•</span>
                          <span>{format(topMatch.bankTransaction.date, 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>{topMatch.bankTransaction.institutionName} - {topMatch.bankTransaction.accountName}</span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {txMatches.map((match, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${match.type === 'income' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                          {match.type === 'income' ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {match.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(match.matchScore * 100)}% match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {match.type === 'income' && match.matchedIncome && (
                              <>
                                {match.matchedIncome.source} - {match.matchedIncome.description}
                                <span className="mx-2">•</span>
                                ${match.matchedIncome.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </>
                            )}
                            {match.type === 'vendor' && match.matchedVendorTransaction && (
                              <>
                                {match.matchedVendorTransaction.vendorName} - {match.matchedVendorTransaction.description}
                                <span className="mx-2">•</span>
                                ${match.matchedVendorTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewMatch(match)}
                          disabled={isProcessing}
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptMatch(match)}
                          disabled={isProcessing}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MatchReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        match={selectedMatch}
        onAccept={() => selectedMatch && handleAcceptMatch(selectedMatch)}
        onReject={handleRejectMatch}
      />
    </div>
  );
};

export default MatchTransactions;
