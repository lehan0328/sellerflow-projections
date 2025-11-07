import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ChartBalance {
  date: string;
  projected_balance: number;
  net_change: number;
  starting_balance: number;
}

interface Transaction {
  type: string;
  description?: string;
  amount: number;
  status?: string;
  settlementId?: string;
  name?: string;
}

interface DailyBalance {
  date: string;
  balance: number;
  starting_balance?: number;
  net_change?: number;
  transactions?: Transaction[];
}

interface DailyBalanceTableProps {
  dailyBalances: DailyBalance[];
  chartBalances: ChartBalance[];
  reserveAmount: number;
  currentBalance: number;
}

const DailyBalanceTable = ({ dailyBalances, chartBalances, reserveAmount, currentBalance }: DailyBalanceTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (date: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedRows(newExpanded);
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return 'text-destructive font-semibold';
    if (balance < reserveAmount) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  const getTransactionTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('amazon') || lowerType.includes('payout')) return 'text-blue-600';
    if (lowerType.includes('income') || lowerType.includes('sales')) return 'text-green-600';
    if (lowerType.includes('expense') || lowerType.includes('purchase') || lowerType.includes('vendor')) return 'text-red-600';
    if (lowerType.includes('credit')) return 'text-orange-600';
    return 'text-foreground';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Chart Balance</TableHead>
          <TableHead className="text-right">Buy Opp Balance</TableHead>
          <TableHead className="text-right">Daily Net</TableHead>
          <TableHead className="text-right">Difference</TableHead>
          <TableHead className="text-center">Transactions</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
          {dailyBalances.map((day, index) => {
            const isExpanded = expandedRows.has(day.date);
            const hasTransactions = day.transactions && day.transactions.length > 0;
            
            // Find matching chart balance
            const chartBalance = chartBalances.find(cb => cb.date === day.date);
            const chartProjected = chartBalance?.projected_balance || 0;
            const dailyNet = chartBalance?.net_change || 0;
            const difference = chartProjected - day.balance;
            
            const balanceColor = getBalanceColor(day.balance);

            return (
              <>
                <TableRow key={day.date} className="hover:bg-muted/50">
                  <TableCell>
                    {hasTransactions && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(day.date)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(day.date), "MMM dd, yyyy")}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(day.date), "EEEE")}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold`}>
                    ${chartProjected.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${balanceColor}`}>
                    ${day.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${dailyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dailyNet >= 0 ? '+' : ''}${dailyNet.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${Math.abs(difference) > 10 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {hasTransactions && (
                      <Badge variant="secondary">
                        {day.transactions.length}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {day.balance < 0 ? (
                      <Badge variant="destructive">Negative</Badge>
                    ) : day.balance < reserveAmount ? (
                      <Badge variant="secondary">Below Reserve</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Safe</Badge>
                    )}
                  </TableCell>
                </TableRow>
                
                {isExpanded && hasTransactions && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-muted/30 p-0">
                      <div className="px-8 py-4 space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Transactions on {format(new Date(day.date), 'MMMM dd, yyyy')} ({day.transactions.length} total):
                        </p>
                        {day.transactions?.map((transaction, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between py-2 px-4 bg-background rounded border"
                          >
                            <div className="flex-1">
                              <p className={`font-medium ${getTransactionTypeColor(transaction.type)}`}>
                                {transaction.type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.description || transaction.name || transaction.settlementId || 'No description'}
                              </p>
                              {transaction.status && (
                                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted">
                                  {transaction.status}
                                </span>
                              )}
                            </div>
                            <div className={`font-semibold tabular-nums text-lg ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DailyBalanceTable;
