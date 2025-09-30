import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionLog as TransactionLogComponent } from "@/components/cash-flow/transaction-log";
import { BankTransactionLog } from "@/components/cash-flow/bank-transaction-log";
import { useTransactions } from "@/hooks/useTransactions";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactionMatching, TransactionMatch } from "@/hooks/useTransactionMatching";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function TransactionLog() {
  const navigate = useNavigate();
  const { transactions, deleteTransaction } = useTransactions();
  const { vendors, deleteVendor } = useVendors();
  const { incomeItems, updateIncome, deleteIncome } = useIncome();
  
  // Mock bank transactions for matching demo
  const mockBankTransactions = [
    {
      id: 'bank1',
      accountId: 'acc1',
      accountName: 'Chase Checking',
      institutionName: 'Chase Bank',
      amount: -150.00,
      description: 'Payment to Vendor ABC',
      date: new Date(),
      type: 'debit' as const,
      status: 'posted' as const,
    }
  ];
  
  const { matches, getMatchesForBankTransaction } = useTransactionMatching(
    mockBankTransactions,
    vendors,
    incomeItems
  );

  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(transactionId);
  };

  const handleUndoTransaction = (transactionId: string) => {
    deleteTransaction(transactionId);
  };
  
  const handleMatchTransaction = async (match: TransactionMatch) => {
    try {
      if (match.type === 'vendor' && match.matchedVendor) {
        // Archive vendor by deleting it (marking as paid)
        await deleteVendor(match.matchedVendor.id);
        toast.success(`Matched and archived vendor: ${match.matchedVendor.name}`);
      } else if (match.type === 'income' && match.matchedIncome) {
        // Mark income as received
        await updateIncome(match.matchedIncome.id, { status: 'received' });
        toast.success(`Matched and marked income as received: ${match.matchedIncome.description}`);
      }
    } catch (error) {
      console.error('Error matching transaction:', error);
      toast.error('Failed to match transaction');
    }
  };

  const formattedTransactions = transactions.map(transaction => ({
    id: transaction.id,
    type: transaction.type as 'payment' | 'purchase' | 'adjustment',
    vendor: transaction.vendorId || undefined,
    amount: Number(transaction.amount),
    description: transaction.description || 'Transaction',
    date: new Date(transaction.transactionDate),
    status: transaction.status as 'completed' | 'pending' | 'cancelled'
  }));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Transaction Log
          </h1>
        </div>
        
        <div className="max-w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TransactionLogComponent
              transactions={formattedTransactions}
              onUndoTransaction={handleUndoTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
            <BankTransactionLog 
              transactions={mockBankTransactions}
              matches={matches}
              onMatchTransaction={handleMatchTransaction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}