import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionLog as TransactionLogComponent } from "@/components/cash-flow/transaction-log";
import { BankTransactionLog } from "@/components/cash-flow/bank-transaction-log";
import { ArchivedTransactions } from "@/components/cash-flow/archived-transactions";
import { useTransactions } from "@/hooks/useTransactions";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useTransactionMatching, TransactionMatch } from "@/hooks/useTransactionMatching";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMemo } from "react";

export default function TransactionLog() {
  const navigate = useNavigate();
  const { transactions, deleteTransaction } = useTransactions();
  const { vendors, deleteVendor } = useVendors();
  const { incomeItems, updateIncome, deleteIncome } = useIncome();
  
  // Add example pending income items for matching demonstration
  const exampleIncomeItems = [
    {
      id: 'income1',
      description: 'Monthly Service Fee',
      amount: 3500,
      paymentDate: new Date(2025, 0, 15),
      source: 'Acme Corp',
      status: 'pending' as const,
      category: 'Services',
      isRecurring: false
    },
    {
      id: 'income2', 
      description: 'Consulting Project',
      amount: 5000,
      paymentDate: new Date(2025, 0, 20),
      source: 'TechStart Inc',
      status: 'pending' as const,
      category: 'Consulting',
      isRecurring: false
    }
  ];
  
  // Combine real income items with examples for demo
  const allIncomeItems = [...incomeItems, ...exampleIncomeItems];
  
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
    allIncomeItems
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
        toast.success(`Matched and marked income as received: ${match.matchedIncome.source}`);
      }
    } catch (error) {
      console.error('Error matching transaction:', error);
      toast.error('Failed to match transaction');
    }
  };

  const handleManualMatch = async (bankTransaction: any, matchType: 'vendor' | 'income', matchId: string) => {
    try {
      if (matchType === 'vendor') {
        const vendor = vendors.find(v => v.id === matchId);
        if (vendor) {
          await deleteVendor(matchId);
          toast.success(`Manually matched and archived vendor: ${vendor.name}`);
        }
      } else {
        const income = allIncomeItems.find(i => i.id === matchId);
        if (income) {
          // Only update if it's a real database item
          if (incomeItems.find(i => i.id === matchId)) {
            await updateIncome(matchId, { status: 'received' });
          }
          toast.success(`Manually matched and marked income as received: ${income.source}`);
        }
      }
    } catch (error) {
      console.error('Error in manual match:', error);
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

  // Create archived transactions from matched/completed items
  const archivedTransactions = useMemo(() => {
    const archived = [];
    
    // Add matched vendors (totalOwed = 0)
    vendors.forEach(vendor => {
      if (vendor.totalOwed === 0 && vendor.status === 'upcoming') {
        archived.push({
          id: `vendor-${vendor.id}`,
          type: 'vendor' as const,
          name: vendor.name,
          amount: vendor.nextPaymentAmount || 0,
          description: vendor.poName || vendor.description || 'Vendor payment',
          date: new Date(vendor.nextPaymentDate),
          matchedWith: 'Bank Transaction'
        });
      }
    });
    
    // Add received income
    incomeItems.forEach(income => {
      if (income.status === 'received') {
        archived.push({
          id: `income-${income.id}`,
          type: 'income' as const,
          name: income.source,
          amount: income.amount,
          description: income.description,
          date: new Date(income.paymentDate),
          matchedWith: income.category || undefined
        });
      }
    });
    
    return archived.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [vendors, incomeItems]);

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
        
        <div className="max-w-full space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TransactionLogComponent
              transactions={formattedTransactions}
              onUndoTransaction={handleUndoTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
            <BankTransactionLog 
              transactions={exampleBankTransactions}
              vendors={vendors}
              incomeItems={allIncomeItems}
              matches={matches}
              onMatchTransaction={handleMatchTransaction}
              onManualMatch={handleManualMatch}
            />
          </div>
          
          <ArchivedTransactions 
            transactions={archivedTransactions}
          />
        </div>
      </div>
    </div>
  );
}