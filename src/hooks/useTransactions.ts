import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Transaction {
  id: string;
  type: 'purchase_order' | 'sales_order' | 'vendor_payment' | 'customer_payment' | 'expense';
  amount: number;
  description: string;
  vendorId?: string;
  customerId?: string;
  creditCardId?: string;
  transactionDate: Date;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'cancelled';
  category?: string;
  archived?: boolean;
}

export const useTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // 1. Use useQuery for fetching data with caching
  const { data: transactions = [], isLoading: loading, error } = useQuery({
    queryKey: ['transactions'], // Unique key for this data
    staleTime: 5 * 60 * 1000,   // Consider data fresh for 5 minutes
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      return data.map(transaction => ({
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
      }));
    },
  });

  // 2. Use mutations for updates to automatically invalidate cache
  const addTransactionMutation = useMutation({
    mutationFn: async (transactionData: Omit<Transaction, 'id'>) => {
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
          category: transactionData.category,
          archived: transactionData.archived || false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Forces a refetch of the 'transactions' query everywhere in the app
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Success", description: "Transaction added successfully" });
    },
    onError: (error) => {
      console.error('Error adding transaction:', error);
      toast({ title: "Error", description: "Failed to add transaction", variant: "destructive" });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Success", description: "Transaction deleted successfully" });
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
    }
  });

  const deleteAllTransactionsMutation = useMutation({
     mutationFn: async () => {
       const { error } = await supabase.from('transactions').delete().is('transaction_id', null);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['transactions'] });
     }
  });

  const deleteTransactionsByVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const { error } = await supabase.from('transactions').delete().eq('vendor_id', vendorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Success", description: "Vendor transactions deleted successfully" });
    },
    onError: (error) => {
      console.error('Error deleting vendor transactions:', error);
      toast({ title: "Error", description: "Failed to delete vendor transactions", variant: "destructive" });
    }
  });

  // Realtime subscription setup
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    transactions,
    loading,
    addTransaction: addTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    deleteAllTransactions: deleteAllTransactionsMutation.mutateAsync,
    deleteTransactionsByVendor: deleteTransactionsByVendorMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  };
};