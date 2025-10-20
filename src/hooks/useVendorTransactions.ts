import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VendorTransaction {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  transactionDate: Date;
  status: 'pending' | 'completed' | 'paid' | 'partially_paid';
  description: string;
  category?: string;
  type: string;
  remarks?: string;
  amountPaid?: number;
  remainingBalance?: number;
  creditCardId?: string | null;
}

export const useVendorTransactions = () => {
  const [transactions, setTransactions] = useState<VendorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const parseDateFromDB = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchVendorTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Fetch transactions with vendor information (exclude archived)
      // Using left join to include transactions even if vendor is deleted
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vendors(name, category)
        `)
        .eq('type', 'purchase_order')
        .eq('archived', false)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedTransactions = data?.map(tx => ({
        id: tx.id,
        vendorId: tx.vendor_id,
        vendorName: tx.vendors?.name || 'Unknown',
        amount: Number(tx.amount),
        dueDate: tx.due_date ? parseDateFromDB(tx.due_date) : new Date(),
        transactionDate: tx.transaction_date ? parseDateFromDB(tx.transaction_date) : new Date(),
        status: tx.status as VendorTransaction['status'],
        description: tx.description || '',
        category: tx.vendors?.category || '',
        type: tx.type,
        remarks: (tx as any).remarks || 'Ordered',
        creditCardId: tx.credit_card_id || null
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching vendor transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          archived: true 
        } as any)
        .eq('id', transactionId);

      if (error) throw error;

      // Remove from local state since it's now archived
      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));

      toast({
        title: "Success",
        description: "Payment marked as paid and archived",
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    }
  };

  const updateRemarks = async (transactionId: string, remarks: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ remarks } as any)
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.map(tx => 
        tx.id === transactionId ? { ...tx, remarks } : tx
      ));
    } catch (error) {
      console.error('Error updating remarks:', error);
      toast({
        title: "Error",
        description: "Failed to update remarks",
        variant: "destructive",
      });
    }
  };

  const updateDueDate = async (transactionId: string, newDueDate: Date) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ due_date: formatDateForDB(newDueDate) } as any)
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.map(tx => 
        tx.id === transactionId ? { ...tx, dueDate: newDueDate } : tx
      ));

      toast({
        title: "Success",
        description: "Due date updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating due date:', error);
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the transaction to check if it's a credit card purchase
      const transactionToDelete = transactions.find(tx => tx.id === transactionId);
      if (!transactionToDelete) throw new Error('Transaction not found');

      // If it's a credit card transaction, revert the credit card balance
      if (transactionToDelete.creditCardId) {
        const { data: creditCard, error: fetchError } = await supabase
          .from('credit_cards')
          .select('balance, available_credit')
          .eq('id', transactionToDelete.creditCardId)
          .single();

        if (fetchError) {
          console.error('Error fetching credit card:', fetchError);
        } else if (creditCard) {
          // Reduce the balance and increase available credit
          const newBalance = Number(creditCard.balance) - transactionToDelete.amount;
          const newAvailableCredit = Number(creditCard.available_credit) + transactionToDelete.amount;

          const { error: updateError } = await supabase
            .from('credit_cards')
            .update({
              balance: newBalance,
              available_credit: newAvailableCredit,
            })
            .eq('id', transactionToDelete.creditCardId);

          if (updateError) {
            console.error('Error updating credit card:', updateError);
          }
        }
      }

      // Delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchVendorTransactions();
  }, []);

  // Realtime subscription
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('vendor-transactions-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
        }, () => {
          fetchVendorTransactions();
        })
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAsPartiallyPaid = async (
    transactionId: string,
    amountPaid: number,
    remainingBalance: number,
    newDueDate: Date
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the original transaction
      const originalTx = transactions.find(tx => tx.id === transactionId);
      if (!originalTx) throw new Error('Transaction not found');

      // Update the parent transaction to mark as partially paid (keep original amount)
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'partially_paid',
          remarks: 'Partially Paid',
        } as any)
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Create PO#.1 transaction for the paid amount (archived, not shown anywhere)
      const { error: paidError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vendor_id: originalTx.vendorId,
          type: 'purchase_order',
          amount: amountPaid,
          due_date: formatDateForDB(new Date()), // Already paid
          transaction_date: formatDateForDB(new Date()),
          status: 'completed',
          description: `${originalTx.description}.1`,
          remarks: 'Partially Paid',
          archived: true
        } as any);

      if (paidError) throw paidError;

      // Create PO#.2 transaction for the remaining balance (shown in vendors overview)
      const { error: remainingError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vendor_id: originalTx.vendorId,
          type: 'purchase_order',
          amount: remainingBalance,
          due_date: formatDateForDB(newDueDate),
          transaction_date: formatDateForDB(new Date()),
          status: 'pending',
          description: `${originalTx.description}.2`,
          remarks: 'Pending Due',
        } as any);

      if (remainingError) throw remainingError;

      // Refresh the transactions list
      await fetchVendorTransactions();

      toast({
        title: "Success",
        description: `Partial payment recorded. ${originalTx.description}.2 created for remaining balance of $${remainingBalance.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Error processing partial payment:', error);
      toast({
        title: "Error",
        description: "Failed to process partial payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    transactions,
    loading,
    markAsPaid,
    markAsPartiallyPaid,
    updateRemarks,
    updateDueDate,
    deleteTransaction,
    refetch: fetchVendorTransactions
  };
};