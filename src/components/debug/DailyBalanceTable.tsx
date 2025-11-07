import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DailyBalance {
  date: string;
  balance: number;
}

interface DailyBalanceTableProps {
  dailyBalances: DailyBalance[];
  reserveAmount: number;
  currentBalance: number;
}

const DailyBalanceTable = ({ dailyBalances, reserveAmount, currentBalance }: DailyBalanceTableProps) => {

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return 'text-destructive font-semibold';
    if (balance < reserveAmount) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  // Calculate net change from previous day
  const calculateNetChange = (index: number) => {
    if (index === 0) {
      return dailyBalances[0].balance - currentBalance;
    }
    return dailyBalances[index].balance - dailyBalances[index - 1].balance;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Projected Balance</TableHead>
            <TableHead className="text-right">Net Change from Prev</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dailyBalances.map((day, index) => {
            const netChange = calculateNetChange(index);
            const startingBalance = index === 0 ? currentBalance : dailyBalances[index - 1].balance;

            return (
              <TableRow key={day.date}>
                <TableCell className="font-medium">
                  <div>
                    <p>{format(new Date(day.date), 'MMM dd, yyyy')}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(day.date), 'EEEE')}
                    </p>
                  </div>
                </TableCell>
                <TableCell className={`text-right tabular-nums ${getBalanceColor(day.balance)}`}>
                  <div>
                    <p className="text-lg font-bold">${day.balance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      From: ${startingBalance.toFixed(2)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className={`text-right tabular-nums ${netChange >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                  {netChange >= 0 ? '+' : ''}${netChange.toFixed(2)}
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DailyBalanceTable;
