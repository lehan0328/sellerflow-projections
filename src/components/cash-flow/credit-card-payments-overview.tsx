import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Search, Calendar, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useCreditCardPayments } from "@/hooks/useCreditCardPayments";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCardPaymentEditDialog } from "./credit-card-payment-edit-dialog";

export const CreditCardPaymentsOverview = () => {
  const { payments, isLoading } = useCreditCardPayments();
  const { creditCards } = useCreditCards();
  const { accounts: bankAccounts } = useBankAccounts();
  
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null);

  // Transform payments to include credit card and bank account names
  const enrichedPayments = useMemo(() => {
    return payments.map(payment => {
      const creditCard = creditCards.find(cc => cc.id === payment.credit_card_id);
      const bankAccount = bankAccounts.find(ba => ba.id === payment.bank_account_id);
      
      return {
        ...payment,
        creditCardName: creditCard?.account_name || 'Unknown Card',
        bankAccountName: bankAccount?.account_name || 'Unknown Account',
      };
    });
  }, [payments, creditCards, bankAccounts]);

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = enrichedPayments.filter(payment => {
      const matchesSearch = (payment.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm) ||
        payment.creditCardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.bankAccountName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [enrichedPayments, searchTerm, sortBy, sortOrder]);

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

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    try {
      const { error } = await supabase
        .from('credit_card_payments')
        .delete()
        .eq('id', paymentToDelete.id);

      if (error) throw error;

      toast.success('Payment deleted successfully');
      setPaymentToDelete(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Card Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading payments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
                      <TableHead>Bank Account</TableHead>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{payment.description || 'Credit Card Payment'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {payment.creditCardName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {payment.bankAccountName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-destructive">
                            {formatCurrency(payment.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPayment(payment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentToDelete(payment)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-1">No scheduled payments</p>
                    <p className="text-sm text-muted-foreground">
                      Credit card payments will appear here once scheduled
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingPayment && (
        <CreditCardPaymentEditDialog
          payment={editingPayment}
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
