import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface BankTransaction {
  id: string;
  bankAccountId?: string;
  creditCardId?: string;
  plaidTransactionId: string;
  amount: number;
  date: Date;
  name: string;
  merchantName?: string;
  category?: string[];
  pending: boolean;
  paymentChannel?: string;
  transactionType?: string;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
  matchedTransactionId?: string;
  matchedType?: 'income' | 'vendor';
}

export const useBankTransactions = (accountId?: string, accountType: 'bank' | 'credit' = 'bank') => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['bank_transactions', accountId, accountType],
    staleTime: 2 * 60 * 1000, // 2 minutes - transactions change frequently
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (accountId) {
        // Query by the appropriate column based on account type
        const columnName = accountType === 'credit' ? 'credit_card_id' : 'bank_account_id';
        query = query.eq(columnName, accountId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bank transactions:', error);
        throw error;
      }

      return (data || []).map(tx => ({
        id: tx.id,
        bankAccountId: tx.bank_account_id,
        creditCardId: tx.credit_card_id,
        plaidTransactionId: tx.plaid_transaction_id,
        amount: Number(tx.amount),
        date: new Date(tx.date),
        name: tx.name,
        merchantName: tx.merchant_name,
        category: tx.category,
        pending: tx.pending,
        paymentChannel: tx.payment_channel,
        transactionType: tx.transaction_type,
        currencyCode: tx.currency_code,
        createdAt: new Date(tx.created_at),
        updatedAt: new Date(tx.updated_at),
        matchedTransactionId: tx.matched_transaction_id,
        matchedType: tx.matched_type,
      }));
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['bank_transactions', accountId, accountType] });
  };

  return {
    transactions,
    isLoading,
    error,
    refetch,
  };
};
