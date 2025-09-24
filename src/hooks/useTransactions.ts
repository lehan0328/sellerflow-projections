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

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data?.map(transaction => ({
        id: transaction.id,
        type: transaction.type as Transaction['type'],
        amount: Number(transaction.amount),
        description: transaction.description || '',
        vendorId: transaction.vendor_id,
        customerId: transaction.customer_id,
        transactionDate: new Date(transaction.transaction_date),
        dueDate: transaction.due_date ? new Date(transaction.due_date) : undefined,
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
          transaction_date: transactionData.transactionDate.toISOString().split('T')[0],
          due_date: transactionData.dueDate?.toISOString().split('T')[0],
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
        transactionDate: new Date(data.transaction_date),
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions
  };
};