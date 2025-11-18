import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { AlertCircle, Trash2, CheckCircle, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface OverdueTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  initialTab?: 'expenses' | 'income' | 'purchaseOrders';
}

export function OverdueTransactionsModal({ open, onOpenChange, onUpdate, initialTab = 'expenses' }: OverdueTransactionsModalProps) {
  const { transactions: purchaseOrders, markAsPaid: markPOPaid, deleteTransaction: deletePO, updateDueDate: updatePODate } = useVendorTransactions();
  const { incomeItems, updateIncome, deleteIncome } = useIncome();
  const { transactions: allTransactions, deleteTransaction: deleteTransactionGeneric, refetch: refetchTransactions } = useTransactions();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [changingDateId, setChangingDateId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'expense' | 'purchaseOrder' | 'income'; name: string } | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter overdue expenses
  const overdueExpenses = allTransactions.filter(tx => {
    const txDate = new Date(tx.transactionDate);
    txDate.setHours(0, 0, 0, 0);
    return tx.type === 'expense' && tx.status === 'pending' && txDate < today;
  });

  // Filter overdue purchase orders
  const overduePurchaseOrders = purchaseOrders.filter(tx => {
    const dueDate = new Date(tx.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return tx.status === 'pending' && dueDate < today;
  });

  // Filter overdue income
  const overdueIncome = incomeItems.filter(income => {
    const paymentDate = new Date(income.paymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    return income.status === 'pending' && paymentDate < today;
  });

  const handleMarkExpensePaid = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', id);
      
      if (error) throw error;
      await refetchTransactions();
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteTransactionGeneric(id);
      onUpdate?.();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPOPaid = async (id: string) => {
    setProcessingId(id);
    try {
      await markPOPaid(id);
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeletePO = async (id: string) => {
    setProcessingId(id);
    try {
      await deletePO(id);
      onUpdate?.();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkIncomePaid = async (income: any) => {
    setProcessingId(income.id);
    try {
      await updateIncome(income.id, { ...income, status: 'received' });
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteIncome(id);
      onUpdate?.();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'expense') {
      handleDeleteExpense(itemToDelete.id);
    } else if (itemToDelete.type === 'purchaseOrder') {
      handleDeletePO(itemToDelete.id);
    } else {
      handleDeleteIncome(itemToDelete.id);
    }
  };

  const openDeleteConfirm = (id: string, type: 'expense' | 'purchaseOrder' | 'income', name: string) => {
    setItemToDelete({ id, type, name });
    setDeleteConfirmOpen(true);
  };

  const handleChangeExpenseDate = async (id: string, newDate: Date) => {
    setProcessingId(id);
    try {
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { error } = await supabase
        .from('transactions')
        .update({ transaction_date: formatDateForDB(newDate) })
        .eq('id', id);
      
      if (error) throw error;
      await refetchTransactions();
      setChangingDateId(null);
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangePODate = async (id: string, newDate: Date) => {
    setProcessingId(id);
    try {
      await updatePODate(id, newDate);
      setChangingDateId(null);
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeIncomeDate = async (income: any, newDate: Date) => {
    setProcessingId(income.id);
    try {
      await updateIncome(income.id, { ...income, paymentDate: newDate });
      setChangingDateId(null);
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Overdue Transactions
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expenses">
              Expenses ({overdueExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="income">
              Income ({overdueIncome.length})
            </TabsTrigger>
            <TabsTrigger value="purchaseOrders">
              Purchase Orders ({overduePurchaseOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            {overdueExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No overdue expenses</p>
            ) : (
              <div className="space-y-3">
                {overdueExpenses.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-4 bg-destructive/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{tx.description || 'Expense'}</div>
                        <div className="text-sm text-muted-foreground">{tx.category}</div>
                        <div className="text-sm text-destructive mt-1">
                          Due: {formatDate(tx.transactionDate)}
                        </div>
                        <div className="text-lg font-bold mt-2">{formatCurrency(Math.abs(tx.amount))}</div>
                      </div>
                      <div className="flex gap-2">
                        <Popover open={changingDateId === tx.id} onOpenChange={(open) => !open && setChangingDateId(null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChangingDateId(tx.id)}
                              disabled={processingId === tx.id}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Change Date
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={new Date(tx.transactionDate)}
                              onSelect={(date) => date && handleChangeExpenseDate(tx.id, date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkExpensePaid(tx.id)}
                          disabled={processingId === tx.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteConfirm(tx.id, 'expense', tx.description || 'Expense')}
                          disabled={processingId === tx.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-4">
            {overdueIncome.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No overdue income</p>
            ) : (
              <div className="space-y-3">
                {overdueIncome.map((income) => (
                  <div key={income.id} className="border rounded-lg p-4 bg-destructive/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{income.description}</div>
                        <div className="text-sm text-muted-foreground">{income.source}</div>
                        <div className="text-sm text-destructive mt-1">
                          Expected: {formatDate(new Date(income.paymentDate))}
                        </div>
                        <div className="text-lg font-bold mt-2">{formatCurrency(income.amount)}</div>
                      </div>
                      <div className="flex gap-2">
                        <Popover open={changingDateId === income.id} onOpenChange={(open) => !open && setChangingDateId(null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChangingDateId(income.id)}
                              disabled={processingId === income.id}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Change Date
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={new Date(income.paymentDate)}
                              onSelect={(date) => date && handleChangeIncomeDate(income, date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkIncomePaid(income)}
                          disabled={processingId === income.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Collected
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteConfirm(income.id, 'income', income.description)}
                          disabled={processingId === income.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete "{itemToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}