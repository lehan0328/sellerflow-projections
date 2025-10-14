import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, TrendingUp, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";

interface BuyingOpportunity {
  date: string;
  availableAmount: number;
  confidence: number;
  reasoning: string;
}

interface BuyingOpportunitiesPanelProps {
  forecastedPayouts: Array<{
    payout_date: string;
    total_amount: number;
    raw_settlement_data?: any;
  }>;
  currentBalance: number;
  upcomingExpenses: number;
  reserveAmount: number;
}

export function BuyingOpportunitiesPanel({
  forecastedPayouts,
  currentBalance,
  upcomingExpenses,
  reserveAmount
}: BuyingOpportunitiesPanelProps) {
  
  // Calculate buying opportunities based on forecasted payouts
  const calculateOpportunities = (): BuyingOpportunity[] => {
    const opportunities: BuyingOpportunity[] = [];
    
    // Start with current available amount (currentBalance - reserveAmount - upcomingExpenses)
    // This ensures consistency with "Available to Spend"
    let baseAvailableAmount = Math.max(0, currentBalance - reserveAmount - upcomingExpenses);
    
    forecastedPayouts.forEach((payout, index) => {
      // Add forecasted payout to available amount
      const availableWithPayout = baseAvailableAmount + payout.total_amount;
      
      if (availableWithPayout > 1000) { // Only show opportunities above $1k
        const confidence = payout.raw_settlement_data?.forecast_metadata?.confidence || 0.7;
        
        opportunities.push({
          date: payout.payout_date,
          availableAmount: availableWithPayout,
          confidence: confidence,
          reasoning: `After ${format(new Date(payout.payout_date), 'MMM dd')} payout`
        });
      }
      
      // Update base for next iteration (cumulative)
      baseAvailableAmount = availableWithPayout;
    });
    
    return opportunities.slice(0, 3); // Show top 3 opportunities
  };
  
  const opportunities = calculateOpportunities();
  
  if (opportunities.length === 0) {
    return null;
  }
  
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Buying Opportunities</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20">
            AI-Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opp, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/10 dark:to-blue-950/10 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <p className="font-semibold text-sm">
                  {format(new Date(opp.date), 'MMM dd, yyyy')}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className="text-xs border-purple-300 text-purple-700"
              >
                {Math.round(opp.confidence * 100)}% confident
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  ${opp.availableAmount.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {opp.reasoning}
              </p>
            </div>
          </div>
        ))}
        
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 These opportunities are calculated based on AI-forecasted payouts, your reserve amount, and upcoming expenses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
