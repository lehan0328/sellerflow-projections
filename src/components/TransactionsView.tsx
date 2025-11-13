import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorsOverview } from "@/components/cash-flow/vendors-overview";
import { IncomeOverview } from "@/components/cash-flow/income-overview";
import { ExpenseOverview } from "@/components/cash-flow/expense-overview";
import { TrendingDown, TrendingUp, Receipt } from "lucide-react";

interface TransactionsViewProps {
  // Vendors props
  bankTransactions: any[];
  onVendorUpdate: () => void;
  refreshKey: number;
  
  // Income props
  incomeItems: any[];
  onCollectToday: (income: any) => void;
  onEditIncome: (income: any) => void;
  onDeleteIncome: (income: any) => void;
  onMatchTransaction: (income: any) => Promise<void>;
  
  // Expense props
  expenses: any[];
  onEditExpense?: (expense: any) => void;
  onDeleteExpense?: (expense: any) => void;
}

export function TransactionsView({
  bankTransactions,
  onVendorUpdate,
  refreshKey,
  incomeItems,
  onCollectToday,
  onEditIncome,
  onDeleteIncome,
  onMatchTransaction,
  expenses,
  onEditExpense,
  onDeleteExpense,
}: TransactionsViewProps) {
  return (
    <Tabs defaultValue="vendors" className="w-full">
      <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
        <TabsTrigger value="vendors" className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Vendors
        </TabsTrigger>
        <TabsTrigger value="expenses" className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Expenses
        </TabsTrigger>
        <TabsTrigger value="income" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Income
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="vendors" className="mt-6">
        <VendorsOverview 
          bankTransactions={bankTransactions}
          onVendorUpdate={onVendorUpdate}
          refreshKey={refreshKey}
        />
      </TabsContent>
      
      <TabsContent value="expenses" className="mt-6">
        <ExpenseOverview
          expenses={expenses}
          onEditExpense={onEditExpense}
          onDeleteExpense={onDeleteExpense}
        />
      </TabsContent>
      
      <TabsContent value="income" className="mt-6">
        <IncomeOverview
          incomeItems={incomeItems}
          bankTransactions={bankTransactions}
          onCollectToday={onCollectToday}
          onEditIncome={onEditIncome}
          onDeleteIncome={onDeleteIncome}
          onMatchTransaction={onMatchTransaction}
        />
      </TabsContent>
    </Tabs>
  );
}
