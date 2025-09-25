import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, DollarSign, AlertTriangle, CreditCard, Search, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";

interface VendorsOverviewProps {
  onTransactionUpdate?: () => void;
}

export const VendorsOverview = ({ onTransactionUpdate }: VendorsOverviewProps) => {
  const { transactions, loading, markAsPaid } = useVendorTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'vendorName' | 'amount' | 'dueDate'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => 
      transaction.status === 'pending' && (
        transaction.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.amount.toString().includes(searchTerm) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'dueDate') {
        aValue = a.dueDate.getTime();
        bValue = b.dueDate.getTime();
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
  }, [transactions, searchTerm, sortBy, sortOrder]);

  const handleMarkAsPaid = async (transaction: any) => {
    await markAsPaid(transaction.id);
    onTransactionUpdate?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'destructive';
      case 'pending':
        return 'default';
      case 'paid':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'overdue') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Calendar className="h-4 w-4" />;
  };

  const isOverdue = (dueDate: Date) => {
    return dueDate < new Date() && dueDate.toDateString() !== new Date().toDateString();
  };

  const totalPending = filteredAndSortedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const overdueAmount = filteredAndSortedTransactions
    .filter(t => isOverdue(t.dueDate))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <Card className="shadow-card h-[700px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Vendor Payments Due</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-semibold">${totalPending.toLocaleString()}</span>
            </div>
            {overdueAmount > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-semibold">
                  ${overdueAmount.toLocaleString()} Overdue
                </span>
              </div>
            )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendorName">Vendor</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
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
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No transactions found matching your search.' : 'No pending payments.'}
            </div>
          ) : (
            filteredAndSortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-base">{transaction.vendorName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <Badge variant={getStatusColor(isOverdue(transaction.dueDate) ? 'overdue' : 'pending')} className="text-xs">
                      {getStatusIcon(isOverdue(transaction.dueDate) ? 'overdue' : 'pending')}
                      <span className="ml-1 capitalize">
                        {isOverdue(transaction.dueDate) ? 'overdue' : 'pending'}
                      </span>
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium text-foreground">
                        ${transaction.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-medium text-foreground">
                        {transaction.dueDate.toLocaleDateString()}
                      </span>
                    </div>
                    {transaction.description && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="font-medium text-foreground text-right max-w-[200px] truncate">
                          {transaction.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary px-6"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mark this payment to {transaction.vendorName} (${transaction.amount.toLocaleString()}) as paid?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleMarkAsPaid(transaction)}>
                        Mark as Paid
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )))}
        </div>
      </CardContent>
    </Card>
  );
};