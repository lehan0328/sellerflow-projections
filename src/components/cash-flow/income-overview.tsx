import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, Calendar, TrendingUp, Plus, Edit, Search, ArrowUpDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
}

interface IncomeOverviewProps {
  incomeItems: IncomeItem[];
  onCollectToday?: (income: IncomeItem) => void;
  onEditIncome?: (income: IncomeItem) => void;
}

export const IncomeOverview = ({ incomeItems, onCollectToday, onEditIncome }: IncomeOverviewProps) => {
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
                className="p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-base">{income.description}</h4>
                      <Badge variant="outline" className="text-xs">
                        {income.category}
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
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium text-foreground">
                          ${income.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="font-medium text-foreground">
                          {income.source}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Payment Date:</span>
                        <span className="font-medium text-foreground">
                          {income.paymentDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEditIncome?.(income)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {income.status === 'pending' && (
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary px-6"
                      onClick={() => handleReceiveTodayClick(income)}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Receive Today
                    </Button>
                  )}
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
              Are you sure you want to mark this income as received today? This will:
              <br />
              • Move the payment date to today ({new Date().toLocaleDateString()})
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