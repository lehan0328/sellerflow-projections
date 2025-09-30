import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Calendar, DollarSign, Search, ArrowUpDown, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";

interface ArchivedTransaction {
  id: string;
  type: 'vendor' | 'income';
  name: string;
  amount: number;
  description: string;
  date: Date;
  matchedWith?: string;
}

interface ArchivedTransactionsProps {
  transactions: ArchivedTransaction[];
  onDeleteTransaction?: (id: string) => void;
}

export const ArchivedTransactions = ({ transactions, onDeleteTransaction }: ArchivedTransactionsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'vendor' | 'income'>('all');

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => 
      (filterType === 'all' || transaction.type === filterType) &&
      (transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
       transaction.amount.toString().includes(searchTerm))
    );

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
  }, [transactions, searchTerm, sortBy, sortOrder, filterType]);

  const totalArchived = filteredAndSortedTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Archive className="h-5 w-5" />
              <span>Archived Transactions</span>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {filteredAndSortedTransactions.length} archived
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">${Math.abs(totalArchived).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search archived transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="vendor">Vendors</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="date">Date</SelectItem>
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
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterType !== 'all' 
                ? 'No archived transactions found matching your filters.' 
                : 'No archived transactions yet.'}
            </div>
          ) : (
            filteredAndSortedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-sm">{transaction.name}</h4>
                      <Badge 
                        variant={transaction.type === 'income' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {transaction.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {transaction.date.toLocaleDateString()}
                          </span>
                        </div>
                        {transaction.matchedWith && (
                          <div className="flex items-center">
                            <span className="text-muted-foreground">Matched with:</span>
                            <span className="font-medium text-foreground ml-1">
                              {transaction.matchedWith}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          transaction.type === 'income' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          ${Math.abs(transaction.amount).toLocaleString()}
                        </span>
                        {onDeleteTransaction && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onDeleteTransaction(transaction.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
