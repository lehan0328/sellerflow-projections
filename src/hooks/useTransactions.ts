import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Transaction {
  id: string;
  type: 'purchase_order' | 'sales_order' | 'vendor_payment' | 'customer_payment';
  amount: number;
  description: string;
  vendorId?: string;
  customerId?: string;
  transactionDate: Date;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Helper function to format date for database without timezone issues
  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse 'YYYY-MM-DD' into a local Date (avoids timezone shift)
  const parseDateFromDB = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data?.map(transaction => ({
        id: transaction.id,
        type: transaction.type as Transaction['type'],
        amount: Number(transaction.amount),
        description: transaction.description || '',
        vendorId: transaction.vendor_id,
        customerId: transaction.customer_id,
        transactionDate: parseDateFromDB(transaction.transaction_date),
        dueDate: transaction.due_date ? parseDateFromDB(transaction.due_date) : undefined,
        status: transaction.status as Transaction['status']
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          vendor_id: transactionData.vendorId,
          customer_id: transactionData.customerId,
          transaction_date: formatDateForDB(transactionData.transactionDate),
          due_date: transactionData.dueDate ? formatDateForDB(transactionData.dueDate) : null,
          status: transactionData.status
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: data.id,
        type: data.type as Transaction['type'],
        amount: Number(data.amount),
        description: data.description || '',
        vendorId: data.vendor_id,
        customerId: data.customer_id,
        transactionDate: parseDateFromDB(data.transaction_date),
        dueDate: data.due_date ? parseDateFromDB(data.due_date) : undefined,
        status: data.status as Transaction['status']
      };

      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      
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

   const deleteAllTransactions = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error('User not authenticated');
 
       const { error } = await supabase
         .from('transactions')
         .delete()
         .eq('user_id', user.id);
 
       if (error) throw error;
 
       setTransactions([]);
     } catch (error) {
       console.error('Error deleting all transactions:', error);
       // Only show toast for actual errors, not for successful cleanup
     }
   };
 
   // Delete all transactions associated with a specific vendor (server-side filter)
   const deleteTransactionsByVendor = async (vendorId: string) => {
     try {
       const { error } = await supabase
         .from('transactions')
         .delete()
         .eq('vendor_id', vendorId);
 
       if (error) throw error;
 
       setTransactions(prev => prev.filter(t => t.vendorId !== vendorId));
       toast({
         title: "Success",
         description: "Vendor transactions deleted successfully",
       });
     } catch (error) {
       console.error('Error deleting vendor transactions:', error);
       toast({
         title: "Error",
         description: "Failed to delete vendor transactions",
         variant: "destructive",
       });
     }
   };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Realtime subscription for transactions
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('transactions-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchTransactions();
        })
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

   return {
     transactions,
     loading,
     addTransaction,
     deleteTransaction,
     deleteAllTransactions,
     deleteTransactionsByVendor,
     refetch: fetchTransactions
   };
};