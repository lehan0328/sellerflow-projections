import { useMemo } from 'react';
import { BankTransaction } from '@/components/cash-flow/bank-transaction-log';

interface VendorTransaction {
  id: string;
  vendorName: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: string;
  category?: string;
}

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  source: string;
  status: 'received' | 'pending' | 'overdue';
  customerId?: string;
}

export interface TransactionMatch {
  bankTransaction: BankTransaction;
  matchedVendorTransaction?: VendorTransaction;
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
  vendorTransactions: VendorTransaction[],
  incomeItems: IncomeItem[]
) => {
  const { matches, potentialMatches } = useMemo(() => {
    const highConfidenceMatches: TransactionMatch[] = [];
    const lowConfidencePotentialMatches: TransactionMatch[] = [];
    
    // Match bank transactions with vendor transactions
    bankTransactions.forEach(bankTx => {
      vendorTransactions.forEach(vendorTx => {
        // Only match pending vendor transactions
        if (vendorTx.status !== 'pending') return;
        
        // Calculate name similarity (compare bank transaction with vendor name and description)
        const nameSimilarity = Math.max(
          calculateStringSimilarity(
            bankTx.merchantName || bankTx.description,
            vendorTx.vendorName
          ),
          calculateStringSimilarity(
            bankTx.merchantName || bankTx.description,
            vendorTx.description
          )
        );
        
        // Check if amounts are exactly equal
        const exactAmountMatch = Math.abs(Math.abs(bankTx.amount) - vendorTx.amount) === 0;
        const amountMatch = areAmountsClose(Math.abs(bankTx.amount), vendorTx.amount);
        
        // High confidence match: name similarity is good OR (amounts match and moderate name similarity)
        if ((nameSimilarity >= 0.6 && amountMatch) || (nameSimilarity >= 0.4 && amountMatch)) {
          const matchScore = (nameSimilarity * 0.6) + (amountMatch ? 0.4 : 0);
          highConfidenceMatches.push({
            bankTransaction: bankTx,
            matchedVendorTransaction: vendorTx,
            matchScore,
            type: 'vendor'
          });
        }
        // Potential match: exact amount but low name similarity
        else if (exactAmountMatch && nameSimilarity < 0.4) {
          const matchScore = nameSimilarity * 0.3; // Lower score for potential matches
          lowConfidencePotentialMatches.push({
            bankTransaction: bankTx,
            matchedVendorTransaction: vendorTx,
            matchScore,
            type: 'vendor'
          });
        }
      });
      
      // Match with income items
      incomeItems.forEach(income => {
        if (income.status !== 'pending') return;
        
        const nameSimilarity = Math.max(
          calculateStringSimilarity(
            bankTx.merchantName || bankTx.description,
            income.source
          ),
          calculateStringSimilarity(
            bankTx.merchantName || bankTx.description,
            income.description
          )
        );
        
        const exactAmountMatch = Math.abs(Math.abs(bankTx.amount) - income.amount) === 0;
        const amountMatch = areAmountsClose(Math.abs(bankTx.amount), income.amount);
        
        // High confidence match
        if ((nameSimilarity >= 0.6 && amountMatch) || (nameSimilarity >= 0.4 && amountMatch)) {
          const matchScore = (nameSimilarity * 0.6) + (amountMatch ? 0.4 : 0);
          highConfidenceMatches.push({
            bankTransaction: bankTx,
            matchedIncome: income,
            matchScore,
            type: 'income'
          });
        }
        // Potential match: exact amount but low name similarity
        else if (exactAmountMatch && nameSimilarity < 0.4) {
          const matchScore = nameSimilarity * 0.3;
          lowConfidencePotentialMatches.push({
            bankTransaction: bankTx,
            matchedIncome: income,
            matchScore,
            type: 'income'
          });
        }
      });
    });
    
    return { 
      matches: highConfidenceMatches,
      potentialMatches: lowConfidencePotentialMatches 
    };
  }, [bankTransactions, vendorTransactions, incomeItems]);
  
  const getMatchesForBankTransaction = (bankTxId: string) => {
    return matches.filter(m => m.bankTransaction.id === bankTxId);
  };
  
  const getMatchesForVendorTransaction = (vendorTxId: string) => {
    return matches.filter(m => m.matchedVendorTransaction?.id === vendorTxId);
  };
  
  const getMatchesForIncome = (incomeId: string) => {
    return matches.filter(m => m.matchedIncome?.id === incomeId);
  };
  
  return {
    matches,
    potentialMatches,
    isLoading: false,
    getMatchesForBankTransaction,
    getMatchesForVendorTransaction,
    getMatchesForIncome
  };
};
