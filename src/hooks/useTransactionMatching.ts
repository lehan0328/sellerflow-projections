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
    
    // Match bank transactions with vendors
    bankTransactions.forEach(bankTx => {
      vendors.forEach(vendor => {
        if (!vendor.totalOwed || vendor.totalOwed <= 0) return;
        
        // Calculate name similarity
        const nameSimilarity = calculateStringSimilarity(
          bankTx.merchantName || bankTx.description,
          vendor.name
        );
        
        // Check if amounts are close
        const amountMatch = areAmountsClose(Math.abs(bankTx.amount), vendor.totalOwed);
        
        // Match if name similarity is good and amounts are close
        if (nameSimilarity >= 0.6 && amountMatch) {
          const matchScore = (nameSimilarity + (amountMatch ? 0.4 : 0)) / 2;
          potentialMatches.push({
            bankTransaction: bankTx,
            matchedVendor: vendor,
            matchScore,
            type: 'vendor'
          });
        }
      });
      
      // Match with income items
      incomeItems.forEach(income => {
        if (income.status !== 'pending') return;
        
        const nameSimilarity = calculateStringSimilarity(
          bankTx.merchantName || bankTx.description,
          income.source || income.description
        );
        
        const amountMatch = areAmountsClose(bankTx.amount, income.amount);
        
        if (nameSimilarity >= 0.6 && amountMatch) {
          const matchScore = (nameSimilarity + (amountMatch ? 0.4 : 0)) / 2;
          potentialMatches.push({
            bankTransaction: bankTx,
            matchedIncome: income,
            matchScore,
            type: 'income'
          });
        }
      });
    });
    
    return potentialMatches;
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
    isLoading: false,
    getMatchesForBankTransaction,
    getMatchesForVendor,
    getMatchesForIncome
  };
};
