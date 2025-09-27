import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Filter, Search, RefreshCw, DollarSign, ArrowUpDown, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";

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

interface BankTransactionLogProps {
  transactions?: BankTransaction[];
  onSyncTransactions?: (accountId: string) => void;
}

export const BankTransactionLog = ({ transactions = [], onSyncTransactions }: BankTransactionLogProps) => {
  const { accounts } = useBankAccounts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock bank transactions for demonstration
  const mockTransactions: BankTransaction[] = [
    {
      id: '1',
      accountId: 'acc1',
      accountName: 'Chase Checking',
      institutionName: 'Chase Bank',
      amount: -45.67,
      description: 'Starbucks Coffee',
      category: 'Food & Drink',
      date: new Date(2024, 0, 15),
      type: 'debit',
      status: 'posted',
      merchantName: 'Starbucks',
      plaidTransactionId: 'plaid_tx_1'
    },
    {
      id: '2',
      accountId: 'acc1',
      accountName: 'Chase Checking',
      institutionName: 'Chase Bank',
      amount: 2500.00,
      description: 'Direct Deposit - Salary',
      category: 'Payroll',
      date: new Date(2024, 0, 14),
      type: 'credit',
      status: 'posted',
      merchantName: 'Employer Inc',
      plaidTransactionId: 'plaid_tx_2'
    },
    {
      id: '3',
      accountId: 'acc2',
      accountName: 'Wells Fargo Savings',
      institutionName: 'Wells Fargo',
      amount: -125.00,
      description: 'Transfer to Checking',
      category: 'Transfer',
      date: new Date(2024, 0, 13),
      type: 'debit',
      status: 'posted',
      plaidTransactionId: 'plaid_tx_3'
    }
  ];

  const allTransactions = transactions.length > 0 ? transactions : mockTransactions;

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

  const handleSyncAll = () => {
    toast.success("Syncing all bank accounts...");
    accounts.forEach(account => {
      onSyncTransactions?.(account.id);
    });
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
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No bank transactions found</p>
              {accounts.length === 0 && (
                <p className="text-xs mt-1">Connect a bank account to see transactions</p>
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
                          <p className="text-sm font-medium">{transaction.description}</p>
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
                        
                        {transaction.merchantName && transaction.merchantName !== transaction.description && (
                          <div className="text-xs text-muted-foreground">
                            Merchant: {transaction.merchantName}
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
    </Card>
  );
};