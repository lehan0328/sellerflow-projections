import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VendorTransaction {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  category: string;
  description?: string;
  type: 'expense' | 'payable';
}

export const useVendorTransactions = () => {
  const [transactions, setTransactions] = useState<VendorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchVendorTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vendors (name, category)
        `)
        .eq('type', 'expense')
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedTransactions = data?.map(transaction => ({
        id: transaction.id,
        vendorId: transaction.vendor_id || '',
        vendorName: transaction.vendors?.name || 'Unknown Vendor',
        amount: Number(transaction.amount),
        dueDate: transaction.due_date ? new Date(transaction.due_date) : new Date(),
        status: transaction.status as VendorTransaction['status'],
        category: transaction.vendors?.category || 'Uncategorized',
        description: transaction.description || '',
        type: transaction.type as VendorTransaction['type']
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
          status: 'paid',
          transaction_date: formatDateForDB(new Date())
        })
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, status: 'paid' as const }
          : transaction
      ));

      toast({
        title: "Success",
        description: "Transaction marked as paid",
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

  useEffect(() => {
    fetchVendorTransactions();
  }, []);

  return {
    transactions,
    loading,
    markAsPaid,
    refetch: fetchVendorTransactions
  };
};