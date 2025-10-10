import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { TransactionMatch } from "@/hooks/useTransactionMatching";

interface TransactionMatchButtonProps {
  matches: TransactionMatch[];
  onMatchAll: () => void;
  onReviewMatches: () => void;
}

export const TransactionMatchButton = ({ 
  matches, 
  onMatchAll,
  onReviewMatches 
}: TransactionMatchButtonProps) => {
  if (matches.length === 0) {
    return null;
  }

  const incomeMatches = matches.filter(m => m.type === 'income').length;
  const vendorMatches = matches.filter(m => m.type === 'vendor').length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="default" 
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
        >
          <Link2 className="h-5 w-5 mr-2 animate-pulse" />
          <span className="font-semibold">Match Transactions</span>
          <Badge 
            variant="secondary" 
            className="ml-2 bg-white/20 text-white border-white/30"
          >
            {matches.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-base">
          Transaction Matches Found
        </DropdownMenuLabel>
        <div className="px-2 py-3 text-sm text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Income matches:</span>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {incomeMatches}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Vendor matches:</span>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {vendorMatches}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onMatchAll}
          className="cursor-pointer font-semibold text-primary"
        >
          <Zap className="h-4 w-4 mr-2" />
          Match All ({matches.length}) Instantly
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onReviewMatches}
          className="cursor-pointer"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Review Matches Individually
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
