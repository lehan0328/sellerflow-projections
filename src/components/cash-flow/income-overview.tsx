import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, Calendar, TrendingUp, Plus, Edit, Search, ArrowUpDown, Trash2, Link2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useTransactionMatching } from "@/hooks/useTransactionMatching";
import { BankTransaction } from "./bank-transaction-log";
import { toast } from "sonner";
import * as React from "react";

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  source: string;
  status: 'received' | 'pending' | 'overdue';
  category: string;
  isRecurring: boolean;
  customerId?: string;
  customer?: string;
}

interface IncomeOverviewProps {
  incomeItems: IncomeItem[];
  bankTransactions?: BankTransaction[];
  onCollectToday?: (income: IncomeItem) => void;
  onEditIncome?: (income: IncomeItem) => void;
  onDeleteIncome?: (income: IncomeItem) => void;
  onMatchTransaction?: (income: IncomeItem) => Promise<void>;
}

export const IncomeOverview = ({ incomeItems, bankTransactions = [], onCollectToday, onEditIncome, onDeleteIncome, onMatchTransaction }: IncomeOverviewProps) => {
  const { matches, getMatchesForIncome } = useTransactionMatching(bankTransactions, [], incomeItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'description' | 'amount' | 'paymentDate' | 'source'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // State for confirmation dialog
  const [confirmingIncome, setConfirmingIncome] = useState<IncomeItem | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Filter and sort income items
  const filteredAndSortedIncomes = useMemo(() => {
    let filtered = incomeItems.filter(income => 
      income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      income.amount.toString().includes(searchTerm) ||
      income.source.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'paymentDate') {
        aValue = a.paymentDate.getTime();
        bValue = b.paymentDate.getTime();
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
  }, [incomeItems, searchTerm, sortBy, sortOrder]);

  const handleCollectToday = (income: IncomeItem) => {
    // Update income status to received - this will be handled by the parent component
    // which will update the database and refresh the data
    onCollectToday?.(income);
  };

  const handleReceiveTodayClick = (income: IncomeItem) => {
    setConfirmingIncome(income);
    setShowConfirmDialog(true);
  };

  const handleConfirmReceiveToday = () => {
    if (confirmingIncome) {
      handleCollectToday(confirmingIncome);
    }
    setShowConfirmDialog(false);
    setConfirmingIncome(null);
  };

  const handleCancelReceiveToday = () => {
    setShowConfirmDialog(false);
    setConfirmingIncome(null);
  };

  const handleMatch = async (income: IncomeItem) => {
    try {
      // Create a completed transaction record first
      if (onMatchTransaction) {
        await onMatchTransaction(income);
      }
      
      // Then mark as received by updating status
      if (onCollectToday) {
        onCollectToday(income);
      }
      
      toast.success("Match successful", {
        description: `${income.source} transaction has been matched.`
      });
    } catch (error) {
      console.error('Error matching transaction:', error);
      toast.error("Failed to match transaction");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'secondary';
      case 'pending':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'overdue') {
      return <Calendar className="h-4 w-4" />;
    }
    return <TrendingUp className="h-4 w-4" />;
  };

  const totalExpected = filteredAndSortedIncomes.reduce((sum, income) => sum + income.amount, 0);
  const pendingAmount = filteredAndSortedIncomes
    .filter(i => i.status === 'pending')
    .reduce((sum, income) => sum + income.amount, 0);

  return (
    <Card className="shadow-card h-[700px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Income Overview</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Expected:</span>
                <span className="font-semibold">${totalExpected.toLocaleString()}</span>
              </div>
              {pendingAmount > 0 && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-500 font-semibold">
                    ${pendingAmount.toLocaleString()} Pending
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
              placeholder="Search income or amounts..."
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
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="source">Source</SelectItem>
                <SelectItem value="paymentDate">Payment Date</SelectItem>
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
          {filteredAndSortedIncomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No income items found matching your search.' : 'No income items to display.'}
            </div>
          ) : (
            filteredAndSortedIncomes.map((income) => (
              <div
                key={income.id}
                className="p-2 border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-sm">{income.source}</h4>
                        <Badge variant="outline" className="text-xs">
                          {income.description}
                        </Badge>
                        <Badge variant={getStatusColor(income.status)} className="text-xs">
                          {getStatusIcon(income.status)}
                          <span className="ml-1 capitalize">{income.status}</span>
                        </Badge>
                        {income.isRecurring && (
                          <Badge variant="secondary" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium text-sm text-right">
                        ${income.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium text-foreground ml-2">
                            {income.category || 'Uncategorized'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-muted-foreground">Payment Date:</span>
                          <span className="font-medium text-foreground ml-2">
                            {income.paymentDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onEditIncome?.(income)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        {getMatchesForIncome(income.id).length > 0 && income.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleMatch(income)}
                          >
                            <Link2 className="mr-1 h-3 w-3" />
                            Match
                          </Button>
                        )}
                        {income.status === 'pending' && getMatchesForIncome(income.id).length === 0 && (
                          <Button 
                            size="sm" 
                            className="bg-gradient-primary px-4"
                            onClick={() => handleReceiveTodayClick(income)}
                          >
                            <DollarSign className="mr-1 h-3 w-3" />
                            Receive Today
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onDeleteIncome?.(income)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this income as received? This will:
              <br />
              • Keep the original payment date ({confirmingIncome?.paymentDate.toLocaleDateString()})
              • Add ${confirmingIncome?.amount.toLocaleString() || 0} to your available cash
              • Mark the payment as completed
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReceiveToday}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReceiveToday}
              className="bg-gradient-primary"
            >
              Yes, Receive Today
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};