import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Search, Calendar, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";

interface CreditCardPayment {
  id: string;
  date: Date;
  amount: number;
  name: string;
  creditCardName?: string;
  bankAccountName?: string;
}

interface CreditCardPaymentsOverviewProps {
  payments: CreditCardPayment[];
}

export const CreditCardPaymentsOverview = ({ payments }: CreditCardPaymentsOverviewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      const matchesSearch = payment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm) ||
        (payment.creditCardName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (payment.bankAccountName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = a.date.getTime() - b.date.getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [payments, searchTerm, sortBy, sortOrder]);

  const totalPayments = useMemo(() => {
    return filteredAndSortedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [filteredAndSortedPayments]);

  const toggleSort = (column: 'date' | 'amount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Credit Card Payments</CardTitle>
          </div>
          <Badge variant="secondary" className="text-sm">
            {filteredAndSortedPayments.length} payment{filteredAndSortedPayments.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Summary Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPayments)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          {filteredAndSortedPayments.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start"
                        onClick={() => toggleSort('date')}
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Credit Card</TableHead>
                    <TableHead>From Account</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-end"
                        onClick={() => toggleSort('amount')}
                      >
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(payment.date, "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>{payment.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {payment.creditCardName || 'Unknown Card'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {payment.bankAccountName || 'Unknown Account'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        -{formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No credit card payments found</p>
              <p className="text-sm mt-2">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Credit card payments will appear here"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
