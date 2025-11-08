import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useIncome } from "@/hooks/useIncome";
import { AlertCircle, Trash2, CheckCircle, Calendar } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface OverdueTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function OverdueTransactionsModal({ open, onOpenChange, onUpdate }: OverdueTransactionsModalProps) {
  const { transactions, markAsPaid, deleteTransaction, updateDueDate } = useVendorTransactions();
  const { incomeItems, updateIncome, deleteIncome } = useIncome();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [changingDateId, setChangingDateId] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter overdue vendor transactions
  const overdueVendorTransactions = transactions.filter(tx => {
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

  const handleMarkVendorPaid = async (id: string) => {
    setProcessingId(id);
    try {
      await markAsPaid(id);
      onUpdate?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteTransaction(id);
      onUpdate?.();
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
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeVendorDate = async (id: string, newDate: Date) => {
    setProcessingId(id);
    try {
      await updateDueDate(id, newDate);
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

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
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

        <Tabs defaultValue="vendors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vendors">
              Overdue Payments ({overdueVendorTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="income">
              Overdue Income ({overdueIncome.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            {overdueVendorTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No overdue vendor payments</p>
            ) : (
              <div className="space-y-3">
                {overdueVendorTransactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-4 bg-destructive/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{tx.vendorName}</div>
                        <div className="text-sm text-muted-foreground">{tx.description}</div>
                        <div className="text-sm text-destructive mt-1">
                          Due: {formatDate(tx.dueDate)}
                        </div>
                        <div className="text-lg font-bold mt-2">{formatCurrency(tx.amount)}</div>
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
                              selected={new Date(tx.dueDate)}
                              onSelect={(date) => date && handleChangeVendorDate(tx.id, date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkVendorPaid(tx.id)}
                          disabled={processingId === tx.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVendor(tx.id)}
                          disabled={processingId === tx.id}
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
                          onClick={() => handleDeleteIncome(income.id)}
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
      </DialogContent>
    </Dialog>
  );
}
