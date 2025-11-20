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
import { CreditCard, Search, Calendar, ArrowUpDown, Pencil, Trash2, Receipt } from "lucide-react";
import { format, parseISO, startOfDay, addDays } from "date-fns";
import { formatCurrency, parseISODate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useCreditCardPayments } from "@/hooks/useCreditCardPayments";
import { useCreditCards } from "@/hooks/useCreditCards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCardPaymentEditDialog } from "./credit-card-payment-edit-dialog";

type EnrichedPayment = {
  id: string;
  credit_card_id: string;
  payment_date: string;
  amount: number;
  description: string | null;
  payment_type: 'manual' | 'bill_payment';
  creditCardName: string;
  isDynamic?: boolean;
};

export const CreditCardPaymentsOverview = () => {
  const { payments, isLoading } = useCreditCardPayments();
  const { creditCards } = useCreditCards();
  
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null);

  // Generate dynamic bill payments and combine with manual payments
  const enrichedPayments = useMemo(() => {
    const today = startOfDay(new Date());
    
    // Track which cards we've already generated bill payments for (deduplication)
    const processedCardIds = new Set<string>();
    
    // Generate bill payments from credit cards
    const billPayments: EnrichedPayment[] = creditCards
      .filter(card => {
        // Skip if already processed (deduplication)
        if (processedCardIds.has(card.id)) return false;
        
        // Only include cards with due dates and balances
        if (!card.payment_due_date || (card.statement_balance || card.balance) <= 0) return false;
        
        processedCardIds.add(card.id);
        return true;
      })
      .map(card => {
        // Parse payment due date consistently using parseISODate to avoid timezone bugs
        const dueDate = parseISODate(card.payment_due_date!);
        
        // Calculate early payments for this card
        const earlyPayments = payments.filter(
          p => p.credit_card_id === card.id && 
          p.payment_type === 'manual' &&
          parseISODate(p.payment_date) < dueDate &&
          p.was_paid !== false
        );
        const totalEarlyPayments = earlyPayments.reduce((sum, p) => sum + p.amount, 0);
        
        // Determine payment amount based on pay_minimum setting
        let paymentAmount: number;
        if (card.pay_minimum && card.minimum_payment) {
          paymentAmount = card.minimum_payment;
        } else {
          const effectiveStatementBalance = Math.max(0, (card.statement_balance || card.balance) - totalEarlyPayments);
          paymentAmount = effectiveStatementBalance;
        }
        
        // Skip if payment amount is zero or negative
        if (paymentAmount <= 0) return null;
        
        return {
          id: `bill-${card.id}`,
          credit_card_id: card.id,
          payment_date: card.payment_due_date!,
          amount: paymentAmount,
          description: card.pay_minimum ? 'Minimum Payment Due' : 'Statement Balance Due',
          payment_type: 'bill_payment' as const,
          creditCardName: card.account_name,
          isDynamic: true,
        };
      })
      .filter(p => p !== null) as EnrichedPayment[];
    
    // Deduplicate manual payments: keep only the first payment for each card+date+type combo
    const uniqueManualPayments = payments.reduce((acc, payment) => {
      const key = `${payment.credit_card_id}-${payment.payment_date}-${payment.payment_type}`;
      if (!acc.has(key)) {
        acc.set(key, payment);
      }
      return acc;
    }, new Map<string, typeof payments[0]>());

    const manualPayments: EnrichedPayment[] = Array.from(uniqueManualPayments.values()).map(payment => {
      const creditCard = creditCards.find(cc => cc.id === payment.credit_card_id);
      
      return {
        ...payment,
        creditCardName: creditCard?.account_name || 'Unknown Card',
        isDynamic: false,
      };
    });
    
    // Combine and return
    return [...billPayments, ...manualPayments];
  }, [payments, creditCards]);

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = enrichedPayments.filter(payment => {
      const matchesSearch = (payment.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm) ||
        payment.creditCardName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = parseISODate(a.payment_date).getTime() - parseISODate(b.payment_date).getTime();
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

    // Check if this is a dynamic payment (fake ID starting with "bill-")
    if (paymentToDelete.isDynamic || paymentToDelete.id.startsWith('bill-')) {
      toast.error("Cannot delete auto-generated bill payments. Update your credit card settings to change bill payments.");
      setPaymentToDelete(null);
      return;
    }

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
            {/* Info Message */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    About Credit Card Payments
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Bill payments are automatically calculated from your credit card statement balances and due dates. 
                    These cannot be edited or deleted directly. To change these, update your credit card settings in Financial Connections.
                  </p>
                </div>
              </div>
            </div>
            
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
                              {format(addDays(parseISODate(payment.payment_date), -1), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{payment.description || 'Credit Card Payment'}</span>
                            {payment.isDynamic && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                <Receipt className="h-3 w-3 mr-1" />
                                Auto-generated Bill
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {payment.creditCardName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-destructive">
                            {formatCurrency(payment.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.isDynamic ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Auto-generated
                            </Badge>
                          ) : (
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
                          )}
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
