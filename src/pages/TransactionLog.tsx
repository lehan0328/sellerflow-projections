import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionLog as TransactionLogComponent } from "@/components/cash-flow/transaction-log";
import { useTransactions } from "@/hooks/useTransactions";
import { useNavigate } from "react-router-dom";

export default function TransactionLog() {
  const navigate = useNavigate();
  const { transactions, deleteTransaction } = useTransactions();

  const handleUndoTransaction = (transactionId: string) => {
    deleteTransaction(transactionId);
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
        
        <div className="max-w-4xl">
          <TransactionLogComponent
            transactions={formattedTransactions}
            onUndoTransaction={handleUndoTransaction}
          />
        </div>
      </div>
    </div>
  );
}