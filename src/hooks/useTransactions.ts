import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Transaction {
  id: string;
  type: 'purchase_order' | 'sales_order' | 'vendor_payment' | 'customer_payment';
  amount: number;
  description: string;
  vendorId?: string;
  customerId?: string;
  creditCardId?: string;
  transactionDate: Date;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'cancelled';
  category?: string;
}

export const useTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

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

  const fetchTransactions = async (): Promise<Transaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(200); // Limit initial fetch to 200 most recent

    if (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
      return [];
    }

    return data?.map(transaction => ({
      id: transaction.id,
      type: transaction.type as Transaction['type'],
      amount: Number(transaction.amount),
      description: transaction.description || '',
      vendorId: transaction.vendor_id,
      customerId: transaction.customer_id,
      creditCardId: transaction.credit_card_id,
      transactionDate: parseDateFromDB(transaction.transaction_date),
      dueDate: transaction.due_date ? parseDateFromDB(transaction.due_date) : undefined,
      status: transaction.status as Transaction['status'],
      category: transaction.category
    })) || [];
  };

  // Use React Query with 15-minute staleTime (transactions change ~5 times/day)
  const { data: transactions = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

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
          credit_card_id: transactionData.creditCardId,
          transaction_date: formatDateForDB(transactionData.transactionDate),
          due_date: transactionData.dueDate ? formatDateForDB(transactionData.dueDate) : null,
          status: transactionData.status,
          category: transactionData.category
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
        creditCardId: data.credit_card_id,
        transactionDate: parseDateFromDB(data.transaction_date),
        dueDate: data.due_date ? parseDateFromDB(data.due_date) : undefined,
        status: data.status as Transaction['status'],
        category: data.category
      };

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
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
          .is('transaction_id', null);
 
       if (error) throw error;
 
       await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
 
       await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

  // Set up debounced real-time updates
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const debouncedRefetch = () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        // Wait 1.5 seconds before refetching
        debounceTimerRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: ['transactions'],
            exact: true 
          });
        }, 1500);
      };

      channel = supabase
        .channel('transactions-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
        }, debouncedRefetch)
        .subscribe();
    };
    setup();
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

   return {
     transactions,
     loading,
     addTransaction,
     deleteTransaction,
     deleteAllTransactions,
     deleteTransactionsByVendor,
     refetch
   };
};