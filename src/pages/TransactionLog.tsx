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
  
  // Example bank transactions for matching demonstration
  const exampleBankTransactions = [
    {
      id: 'bank1',
      accountId: 'acc1',
      accountName: 'Chase Business Checking',
      institutionName: 'Chase Bank',
      amount: -1250.00,
      description: 'ACH Payment - ABC Supplies Co',
      merchantName: 'ABC Supplies',
      category: 'Business Expense',
      date: new Date(2025, 0, 15),
      type: 'debit' as const,
      status: 'posted' as const,
    },
    {
      id: 'bank2',
      accountId: 'acc1',
      accountName: 'Chase Business Checking',
      institutionName: 'Chase Bank',
      amount: 3500.00,
      description: 'Direct Deposit - Client Payment Acme Corp',
      merchantName: 'Acme Corporation',
      category: 'Income',
      date: new Date(2025, 0, 14),
      type: 'credit' as const,
      status: 'posted' as const,
    },
    {
      id: 'bank3',
      accountId: 'acc2',
      accountName: 'Wells Fargo Business',
      institutionName: 'Wells Fargo',
      amount: -875.50,
      description: 'Wire Transfer - XYZ Manufacturing',
      merchantName: 'XYZ Manufacturing',
      category: 'Supplies',
      date: new Date(2025, 0, 13),
      type: 'debit' as const,
      status: 'posted' as const,
    },
    {
      id: 'bank4',
      accountId: 'acc1',
      accountName: 'Chase Business Checking',
      institutionName: 'Chase Bank',
      amount: 2100.00,
      description: 'Payment Received - Tech Services Inc',
      merchantName: 'Tech Services',
      category: 'Revenue',
      date: new Date(2025, 0, 12),
      type: 'credit' as const,
      status: 'posted' as const,
    },
    {
      id: 'bank5',
      accountId: 'acc2',
      accountName: 'Wells Fargo Business',
      institutionName: 'Wells Fargo',
      amount: -450.00,
      description: 'Online Payment - Office Depot',
      merchantName: 'Office Depot',
      category: 'Office Supplies',
      date: new Date(2025, 0, 11),
      type: 'debit' as const,
      status: 'posted' as const,
    }
  ];
  
  const { matches, isLoading: matchingLoading } = useTransactionMatching(
    exampleBankTransactions,
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
              transactions={exampleBankTransactions}
              matches={matches}
              onMatchTransaction={handleMatchTransaction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}