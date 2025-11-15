import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';

interface BuyingOpportunity {
  date: string; // When funds are available (peak date)
  lowPointDate: string; // Actual lowest point in projection
  balance: number;
  available_date?: string;
}

interface BuyingOpportunitiesTableProps {
  opportunities: BuyingOpportunity[];
}

const BuyingOpportunitiesTable = ({ opportunities }: BuyingOpportunitiesTableProps) => {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No buying opportunities found in the next 90 days</p>
        <p className="text-sm mt-1">This means projected balance stays below reserve amount</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Opportunity #</TableHead>
            <TableHead>Low Point Date</TableHead>
            <TableHead>Funds Available Date</TableHead>
            <TableHead>Earliest Safe Spend Date</TableHead>
            <TableHead className="text-right">Amount Available</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                  </div>
                </div>
              </TableCell>
              
              {/* Low Point Date - the valley bottom */}
              <TableCell>
                <div>
                  <p className="font-medium">
                    {format(new Date(opportunity.lowPointDate), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lowest balance in projection
                  </p>
                </div>
              </TableCell>
              
              {/* Funds Available Date - when money arrives at peak */}
              <TableCell>
                <div>
                  <p className="font-medium">
                    {format(new Date(opportunity.date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Peak balance date
                  </p>
                </div>
              </TableCell>
              
              {/* Earliest Safe Spend Date */}
              <TableCell>
                {opportunity.available_date ? (
                  <div>
                    <p className="font-medium">
                      {format(new Date(opportunity.available_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Safe to commit funds
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Same as available date</span>
                )}
              </TableCell>
              
              {/* Amount */}
              <TableCell className="text-right">
                <span className="text-lg font-bold text-green-600 tabular-nums">
                  ${opportunity.balance.toFixed(2)}
                </span>
              </TableCell>
              
              {/* Calculation Note */}
              <TableCell className="text-sm text-muted-foreground">
                Peak balance - reserve amount
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BuyingOpportunitiesTable;
