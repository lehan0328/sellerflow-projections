import { useMemo } from 'react';
import { BankTransaction } from '@/components/cash-flow/bank-transaction-log';
import { Vendor } from '@/hooks/useVendors';

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
  const matches = useMemo(() => {
    const potentialMatches: TransactionMatch[] = [];
    
    // Only look at debit transactions for vendor matching
    const debitTransactions = bankTransactions.filter(t => t.type === 'debit');
    // Only look at credit transactions for income matching
    const creditTransactions = bankTransactions.filter(t => t.type === 'credit');
    
    // Match vendors with debit transactions
    debitTransactions.forEach(bankTx => {
      vendors.forEach(vendor => {
        // Skip vendors with no amount owed
        if (!vendor.totalOwed || vendor.totalOwed <= 0) return;
        
        const nameSimilarity = calculateStringSimilarity(
          bankTx.description || bankTx.merchantName || '',
          vendor.name
        );
        
        const amountMatch = areAmountsClose(bankTx.amount, vendor.totalOwed);
        
        // Require at least 60% name similarity and amount match
        if (nameSimilarity >= 0.6 && amountMatch) {
          const matchScore = nameSimilarity;
          potentialMatches.push({
            bankTransaction: bankTx,
            matchedVendor: vendor,
            matchScore,
            type: 'vendor'
          });
        }
      });
    });
    
    // Match income with credit transactions
    creditTransactions.forEach(bankTx => {
      incomeItems.forEach(income => {
        // Skip already received income
        if (income.status === 'received') return;
        
        const nameSimilarity = calculateStringSimilarity(
          bankTx.description || bankTx.merchantName || '',
          income.description
        );
        
        const amountMatch = areAmountsClose(bankTx.amount, income.amount);
        
        // Require at least 60% name similarity and amount match
        if (nameSimilarity >= 0.6 && amountMatch) {
          const matchScore = nameSimilarity;
          potentialMatches.push({
            bankTransaction: bankTx,
            matchedIncome: income,
            matchScore,
            type: 'income'
          });
        }
      });
    });
    
    // Sort by match score (best matches first)
    return potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
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
    getMatchesForBankTransaction,
    getMatchesForVendor,
    getMatchesForIncome
  };
};
