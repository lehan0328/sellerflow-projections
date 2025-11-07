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
  reserveAmount: number;
  currentBalance: number;
}

const DailyBalanceTable = ({ dailyBalances, reserveAmount, currentBalance }: DailyBalanceTableProps) => {
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
            <TableHead className="text-right">Starting Balance</TableHead>
            <TableHead className="text-right">Net Change</TableHead>
            <TableHead className="text-right">Ending Balance</TableHead>
            <TableHead className="text-center">Transactions</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dailyBalances.map((day, index) => {
            const isExpanded = expandedRows.has(day.date);
            const transactionCount = day.transactions?.length || 0;
            const startingBalance = day.starting_balance ?? (index === 0 ? currentBalance : dailyBalances[index - 1].balance);
            const netChange = day.net_change ?? 0;

            return (
              <>
                <TableRow 
                  key={day.date}
                  className={`${transactionCount > 0 ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => transactionCount > 0 && toggleRow(day.date)}
                >
                  <TableCell>
                    {transactionCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p>{format(new Date(day.date), 'MMM dd, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(day.date), 'EEEE')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    ${startingBalance.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netChange >= 0 ? '+' : ''}${netChange.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${getBalanceColor(day.balance)}`}>
                    ${day.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {transactionCount > 0 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-2 py-1 text-xs font-semibold">
                        {transactionCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {day.balance < 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                        Negative
                      </span>
                    ) : day.balance < reserveAmount ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Below Reserve
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Safe
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                
                {isExpanded && transactionCount > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/30 p-0">
                      <div className="px-8 py-4 space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          Transactions on {format(new Date(day.date), 'MMMM dd, yyyy')} ({transactionCount} total):
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
