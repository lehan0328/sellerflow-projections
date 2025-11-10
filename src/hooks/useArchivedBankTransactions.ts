import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArchivedBankTransaction {
  id: string;
  bankAccountId?: string;
  creditCardId?: string;
  accountName: string;
  amount: number;
  date: Date;
  name: string;
  merchantName?: string;
  category?: string[];
  matchedTransactionId?: string;
  matchedType?: 'income' | 'vendor';
  matchedName?: string;
  createdAt: Date;
  archivedAt: Date;
}

export const useArchivedBankTransactions = () => {
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['archived_bank_transactions'],
    staleTime: 5 * 60 * 1000, // 5 minutes - archived data changes infrequently
    queryFn: async () => {
      const query = supabase
        .from('bank_transactions')
        .select(`
          *,
          bank_account:bank_accounts(account_name, institution_name),
          credit_card:credit_cards(account_name, institution_name)
        `)
        .eq('archived', true)
        .order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching archived bank transactions:', error);
        throw error;
      }

      return (data || []).map(tx => ({
        id: tx.id,
        bankAccountId: tx.bank_account_id,
        creditCardId: tx.credit_card_id,
        accountName: tx.bank_account?.account_name || tx.credit_card?.account_name || 'Unknown',
        amount: Number(tx.amount),
        date: new Date(tx.date),
        name: tx.name,
        merchantName: tx.merchant_name,
        category: tx.category,
        matchedTransactionId: tx.matched_transaction_id,
        matchedType: tx.matched_type,
        createdAt: new Date(tx.created_at),
        archivedAt: new Date(tx.updated_at),
      }));
    },
  });

  return {
    transactions,
    isLoading,
    error,
  };
};
