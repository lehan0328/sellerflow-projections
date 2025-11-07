import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export interface ChartBalance {
  date: string;
  projected_balance: number;
  net_change: number;
  starting_balance: number;
}

export interface DailyBalance {
  date: string;
  balance: number;
  net_change: number;
  starting_balance: number;
}

export interface DailyBalanceTableProps {
  chartBalances: ChartBalance[];
  dailyBalances: DailyBalance[];
  reserveAmount: number;
}

export const DailyBalanceTable = ({
  chartBalances,
  dailyBalances,
  reserveAmount,
}: DailyBalanceTableProps) => {
  const getBalanceColor = (balance: number) => {
    if (balance < 0) return "text-destructive";
    if (balance < reserveAmount) return "text-warning";
    return "text-success";
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Balance Comparison</h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Chart Balance</TableHead>
                <TableHead className="text-right">Buy Opp Balance</TableHead>
                <TableHead className="text-right">Daily Net</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartBalances.map((chartDay) => {
                const buyOppDay = dailyBalances.find((d) => d.date === chartDay.date);
                const difference = buyOppDay 
                  ? chartDay.projected_balance - buyOppDay.balance 
                  : 0;

                return (
                  <TableRow key={chartDay.date} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {format(parseISO(chartDay.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getBalanceColor(chartDay.projected_balance)}`}>
                      ${chartDay.projected_balance.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right ${buyOppDay ? getBalanceColor(buyOppDay.balance) : ''}`}>
                      {buyOppDay ? `$${buyOppDay.balance.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className={`text-right ${chartDay.net_change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {chartDay.net_change >= 0 ? '+' : ''}${chartDay.net_change.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${Math.abs(difference) > 0.01 ? 'text-warning' : 'text-success'}`}>
                      ${difference.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyBalanceTable;
