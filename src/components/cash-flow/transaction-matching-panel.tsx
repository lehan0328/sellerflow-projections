import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TransactionMatch } from "@/hooks/useTransactionMatching";

interface TransactionMatchingPanelProps {
  matches: TransactionMatch[];
  onAcceptMatch?: (match: TransactionMatch) => void;
}

export const TransactionMatchingPanel = ({ matches, onAcceptMatch }: TransactionMatchingPanelProps) => {
  const navigate = useNavigate();
  
  const topMatches = matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  if (matches.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Transaction Matches</CardTitle>
            <Badge variant="secondary">{matches.length} potential matches</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/bank-transactions")}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Review All</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topMatches.map((match, idx) => (
            <div
              key={`${match.bankTransaction.id}-${idx}`}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className={`p-2 rounded-full ${
                  match.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {match.type === 'income' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {match.bankTransaction.merchantName || match.bankTransaction.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(match.matchScore * 100)}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {match.type === 'income' 
                      ? `Income: ${match.matchedIncome?.description}`
                      : `Vendor: ${match.matchedVendor?.name}`
                    }
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    match.bankTransaction.amount > 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    ${Math.abs(match.bankTransaction.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {match.bankTransaction.date.toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {onAcceptMatch && (
                <Button
                  size="sm"
                  variant="default"
                  className="ml-3"
                  onClick={() => onAcceptMatch(match)}
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  Match
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
