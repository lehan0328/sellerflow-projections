import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Filter, Search, RefreshCw, DollarSign, ArrowUpDown, Building2, Link2, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { TransactionMatch } from "@/hooks/useTransactionMatching";
import { Vendor } from "@/hooks/useVendors";

export interface BankTransaction {
  id: string;
  accountId: string;
  accountName: string;
  institutionName: string;
  amount: number;
  description: string;
  category?: string;
  date: Date;
  type: 'debit' | 'credit';
  status: 'posted' | 'pending';
  merchantName?: string;
  plaidTransactionId?: string;
}

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  source: string;
  status: 'received' | 'pending' | 'overdue';
}

interface BankTransactionLogProps {
  transactions?: BankTransaction[];
  vendors?: Vendor[];
  incomeItems?: IncomeItem[];
  onSyncTransactions?: (accountId: string) => void;
  matches?: TransactionMatch[];
  onMatchTransaction?: (match: TransactionMatch) => void;
  onManualMatch?: (bankTransaction: BankTransaction, matchType: 'vendor' | 'income', matchId: string) => void;
}

export const BankTransactionLog = ({ transactions = [], vendors = [], incomeItems = [], onSyncTransactions, matches = [], onMatchTransaction, onManualMatch }: BankTransactionLogProps) => {
  const { accounts } = useBankAccounts();
  const { transactions: plaidTransactions, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useBankTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Manual match dialog state
  const [manualMatchDialogOpen, setManualMatchDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [selectedMatchType, setSelectedMatchType] = useState<'vendor' | 'income'>('vendor');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Map Plaid transactions to component format
  const mappedPlaidTransactions: BankTransaction[] = plaidTransactions.map(tx => {
    const account = accounts.find(a => a.id === tx.bankAccountId);
    return {
      id: tx.id,
      accountId: tx.bankAccountId,
      accountName: account?.account_name || 'Unknown Account',
      institutionName: account?.institution_name || 'Unknown Bank',
      amount: tx.amount,
      description: tx.merchantName || tx.name,
      category: tx.category?.[0],
      date: tx.date,
      type: tx.amount < 0 ? 'debit' as const : 'credit' as const,
      status: tx.pending ? 'pending' as const : 'posted' as const,
      merchantName: tx.merchantName,
      plaidTransactionId: tx.plaidTransactionId
    };
  });

  // Use Plaid transactions if available, otherwise fall back to prop transactions
  const allTransactions = mappedPlaidTransactions.length > 0 ? mappedPlaidTransactions : transactions;

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = allTransactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.merchantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAccount = selectedAccount === 'all' || transaction.accountId === selectedAccount;
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      
      return matchesSearch && matchesAccount && matchesType;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'date') {
        aValue = a.date.getTime();
        bValue = b.date.getTime();
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      if (typeof aValue === 'number') {
        return sortOrder === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
      }

      return 0;
    });
  }, [allTransactions, searchTerm, selectedAccount, typeFilter, sortBy, sortOrder]);

  const handleSyncAll = async () => {
    toast.success("Syncing all bank accounts...");
    accounts.forEach(account => {
      onSyncTransactions?.(account.id);
    });
    // Refetch transactions after sync
    await refetchTransactions();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'debit':
        return 'destructive';
      case 'credit':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'default';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const openManualMatchDialog = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setSelectedMatchType(transaction.type === 'debit' ? 'vendor' : 'income');
    setSelectedMatchId('');
    setManualMatchDialogOpen(true);
  };

  const handleManualMatch = () => {
    if (selectedTransaction && selectedMatchId && onManualMatch) {
      onManualMatch(selectedTransaction, selectedMatchType, selectedMatchId);
      setManualMatchDialogOpen(false);
      setSelectedTransaction(null);
      setSelectedMatchId('');
    }
  };

  // Filter vendors/income based on transaction type
  const availableVendors = vendors.filter(v => v.totalOwed && v.totalOwed > 0);
  const availableIncome = incomeItems.filter(i => i.status === 'pending');

  return (
    <Card className="shadow-card h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Bank Transactions</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {filteredAndSortedTransactions.length} transactions
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Sync All</span>
            </Button>
          </div>
        </div>
        
        <div className="space-y-3 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credits</SelectItem>
                  <SelectItem value="debit">Debits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <ScrollArea className="h-[500px] pr-4">
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No bank transactions found</p>
              {accounts.length === 0 ? (
                <p className="text-xs mt-1">Connect a bank account to see transactions</p>
              ) : (
                <p className="text-xs mt-1">Transactions will appear here after syncing</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={getTypeColor(transaction.type)} className="text-xs">
                          {transaction.type}
                        </Badge>
                        <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                          {transaction.status}
                        </Badge>
                        {transaction.category && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.category}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{transaction.merchantName || transaction.description}</p>
                          <div className="flex items-center">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className={`font-medium text-sm ${
                              transaction.amount < 0 ? 'text-destructive' : 'text-green-600'
                            }`}>
                              {transaction.amount < 0 ? '-' : '+'}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{transaction.accountName} • {transaction.institutionName}</span>
                          <span>
                            {transaction.date.toLocaleDateString()} at{' '}
                            {transaction.date.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        
                        {/* Show potential matches */}
                        {matches.filter(m => m.bankTransaction.id === transaction.id).map((match, idx) => (
                          <div key={idx} className="mt-2 p-2 bg-muted/30 rounded border border-primary/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Link2 className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium">
                                  Potential match: {match.type === 'vendor' ? match.matchedVendorTransaction?.vendorName : match.matchedIncome?.source}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(match.matchScore * 100)}% match
                                </Badge>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onMatchTransaction?.(match)}
                                className="h-6 text-xs"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Match & Archive
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Manual match button */}
                        {matches.filter(m => m.bankTransaction.id === transaction.id).length === 0 && (
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openManualMatchDialog(transaction)}
                              className="h-7 text-xs w-full"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Manual Match
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      {/* Manual Match Dialog */}
      <Dialog open={manualMatchDialogOpen} onOpenChange={setManualMatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Match Transaction</DialogTitle>
            <DialogDescription>
              Match this bank transaction with a vendor or income item
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded border">
                <div className="font-medium">{selectedTransaction.description}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Amount: <span className={selectedTransaction.amount < 0 ? 'text-destructive' : 'text-green-600'}>
                    {selectedTransaction.amount < 0 ? '-' : '+'}{formatCurrency(selectedTransaction.amount)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedTransaction.date.toLocaleDateString()}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Match Type</Label>
                <RadioGroup value={selectedMatchType} onValueChange={(value: 'vendor' | 'income') => {
                  setSelectedMatchType(value);
                  setSelectedMatchId('');
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vendor" id="vendor" />
                    <Label htmlFor="vendor">Vendor Payment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income" />
                    <Label htmlFor="income">Income Receipt</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>
                  {selectedMatchType === 'vendor' ? 'Select Vendor' : 'Select Income'}
                </Label>
                <ScrollArea className="h-[300px] border rounded p-2">
                  <RadioGroup value={selectedMatchId} onValueChange={setSelectedMatchId}>
                    {selectedMatchType === 'vendor' ? (
                      availableVendors.length > 0 ? (
                        availableVendors.map(vendor => (
                          <div key={vendor.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                            <RadioGroupItem value={vendor.id} id={vendor.id} />
                            <Label htmlFor={vendor.id} className="flex-1 cursor-pointer">
                              <div className="font-medium">{vendor.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Amount owed: ${vendor.totalOwed?.toLocaleString() || 0}
                              </div>
                            </Label>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No vendors with outstanding payments
                        </div>
                      )
                    ) : (
                      availableIncome.length > 0 ? (
                        availableIncome.map(income => (
                          <div key={income.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                            <RadioGroupItem value={income.id} id={income.id} />
                            <Label htmlFor={income.id} className="flex-1 cursor-pointer">
                              <div className="font-medium">{income.source}</div>
                              <div className="text-sm text-muted-foreground">
                                {income.description} - ${income.amount.toLocaleString()}
                              </div>
                            </Label>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No pending income items
                        </div>
                      )
                    )}
                  </RadioGroup>
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualMatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleManualMatch}
              disabled={!selectedMatchId}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Match & Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};