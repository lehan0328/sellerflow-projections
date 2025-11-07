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
  date: string;
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
            <TableHead>Date (Money Arrives)</TableHead>
            <TableHead>Available Date (Can Use)</TableHead>
            <TableHead className="text-right">Balance Available</TableHead>
            <TableHead>Calculation</TableHead>
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
              <TableCell>
                <div>
                  <p className="font-medium">
                    {format(new Date(opportunity.date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(opportunity.date), 'EEEE')}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {opportunity.available_date ? (
                  <div>
                    <p className="font-medium">
                      {format(new Date(opportunity.available_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(opportunity.available_date), 'EEEE')}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Same day</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="text-lg font-bold text-green-600 tabular-nums">
                  ${opportunity.balance.toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                Valley bottom balance - reserve amount
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BuyingOpportunitiesTable;
