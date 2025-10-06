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
  status: 'pending' | 'completed' | 'paid';
  description: string;
  category?: string;
  type: string;
  remarks?: string;
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

      // Fetch transactions with vendor information
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vendors!inner(name, category)
        `)
        .eq('user_id', user.id)
        .eq('type', 'purchase_order')
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
        remarks: (tx as any).remarks || 'Ordered'
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
        .update({ status: 'completed' } as any)
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.map(tx => 
        tx.id === transactionId ? { ...tx, status: 'completed' as const } : tx
      ));

      toast({
        title: "Success",
        description: "Payment marked as paid",
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

  const deleteTransaction = async (transactionId: string) => {
    try {
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
          filter: `user_id=eq.${user.id}`,
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

  return {
    transactions,
    loading,
    markAsPaid,
    updateRemarks,
    deleteTransaction,
    refetch: fetchVendorTransactions
  };
};