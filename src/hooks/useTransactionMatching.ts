import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankTransaction } from '@/components/cash-flow/bank-transaction-log';
import { Vendor } from '@/hooks/useVendors';
import { toast } from 'sonner';

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  source: string;
  status: 'received' | 'pending' | 'overdue';
}

export interface TransactionMatch {
  bankTransaction: BankTransaction;
  matchedVendor?: Vendor;
  matchedIncome?: IncomeItem;
  matchScore: number;
  type: 'vendor' | 'income';
}

// Calculate similarity between two strings (simple Levenshtein-based)
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains check
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const wordSimilarity = commonWords / Math.max(words1.length, words2.length);
  
  return wordSimilarity;
};

// Check if amounts are close enough (within 1% tolerance)
const areAmountsClose = (amount1: number, amount2: number): boolean => {
  const tolerance = Math.abs(amount1) * 0.01; // 1% tolerance
  return Math.abs(Math.abs(amount1) - Math.abs(amount2)) <= tolerance;
};

export const useTransactionMatching = (
  bankTransactions: BankTransaction[],
  vendors: Vendor[],
  incomeItems: IncomeItem[]
) => {
  const [matches, setMatches] = useState<TransactionMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only run matching if we have both bank transactions AND (vendors OR income)
    if (!bankTransactions.length) {
      setMatches([]);
      return;
    }

    const hasVendors = vendors.some(v => v.totalOwed && v.totalOwed > 0);
    const hasIncome = incomeItems.some(i => i.status === 'pending');
    
    if (!hasVendors && !hasIncome) {
      setMatches([]);
      return;
    }

    // Debounce the API call to prevent spamming
    const timeoutId = setTimeout(() => {
      const fetchMatches = async () => {
        setIsLoading(true);
        try {
          console.log('Calling AI to match transactions...');
          
          // Prepare data for AI
          const bankData = bankTransactions.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            merchantName: t.merchantName
          }));
          
          const vendorData = vendors
            .filter(v => v.totalOwed && v.totalOwed > 0)
            .map(v => ({
              id: v.id,
              name: v.name,
              totalOwed: v.totalOwed,
              category: v.category
            }));
          
          const incomeData = incomeItems
            .filter(i => i.status === 'pending')
            .map(i => ({
              id: i.id,
              description: i.description,
              amount: i.amount,
              source: i.source
            }));

          const { data, error } = await supabase.functions.invoke('match-transactions', {
            body: {
              bankTransactions: bankData,
              vendors: vendorData,
              incomeItems: incomeData
            }
          });

          if (error) {
            console.error('Error calling match-transactions:', error);
            if (error.message?.includes('429')) {
              toast.error('Rate limit exceeded. Please wait a moment and try again.');
            } else if (error.message?.includes('402')) {
              toast.error('AI credits exhausted. Please add credits to continue.');
            } else {
              // Don't show toast for other errors to avoid spam
              console.error('Match error:', error.message);
            }
            setMatches([]);
            return;
          }

          console.log('AI matches received:', data);

          // Transform AI response to TransactionMatch format
          const aiMatches: TransactionMatch[] = (data.matches || [])
            .map((match: any) => {
              const bankTx = bankTransactions.find(t => t.id === match.bankTransactionId);
              if (!bankTx) return null;

              if (match.matchType === 'vendor') {
                const vendor = vendors.find(v => v.id === match.matchedId);
                if (!vendor) return null;
                return {
                  bankTransaction: bankTx,
                  matchedVendor: vendor,
                  matchScore: match.confidence,
                  type: 'vendor' as const
                };
              } else {
                const income = incomeItems.find(i => i.id === match.matchedId);
                if (!income) return null;
                return {
                  bankTransaction: bankTx,
                  matchedIncome: income,
                  matchScore: match.confidence,
                  type: 'income' as const
                };
              }
            })
            .filter(Boolean) as TransactionMatch[];

          setMatches(aiMatches);
        } catch (error) {
          console.error('Error in transaction matching:', error);
          setMatches([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMatches();
    }, 1000); // Wait 1 second before making the call

    return () => clearTimeout(timeoutId);
  }, [bankTransactions, vendors, incomeItems]);
  
  const getMatchesForBankTransaction = (bankTxId: string) => {
    return matches.filter(m => m.bankTransaction.id === bankTxId);
  };
  
  const getMatchesForVendor = (vendorId: string) => {
    return matches.filter(m => m.matchedVendor?.id === vendorId);
  };
  
  const getMatchesForIncome = (incomeId: string) => {
    return matches.filter(m => m.matchedIncome?.id === incomeId);
  };
  
  return {
    matches,
    isLoading,
    getMatchesForBankTransaction,
    getMatchesForVendor,
    getMatchesForIncome
  };
};
