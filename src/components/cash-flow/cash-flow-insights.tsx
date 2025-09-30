import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CashFlowInsightsProps {
  currentBalance: number;
  dailyInflow: number;
  dailyOutflow: number;
  upcomingExpenses: number;
  events?: any[];
}

export const CashFlowInsights = ({
  currentBalance,
  dailyInflow,
  dailyOutflow,
  upcomingExpenses,
  events = [],
}: CashFlowInsightsProps) => {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const netDaily = dailyInflow - dailyOutflow;
  const healthStatus = netDaily >= 0 ? "positive" : "negative";

  useEffect(() => {
    fetchAdvice();
  }, [currentBalance, dailyInflow, dailyOutflow, upcomingExpenses]);

  const fetchAdvice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cash-flow-advice", {
        body: {
          currentBalance,
          dailyInflow,
          dailyOutflow,
          upcomingExpenses,
          chartData: events.slice(-7), // Last 7 days
        },
      });

      if (error) throw error;

      if (data?.advice) {
        setAdvice(data.advice);
      }
    } catch (error: any) {
      console.error("Failed to fetch advice:", error);
      if (error.message?.includes("429")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
      } else if (error.message?.includes("402")) {
        toast({
          title: "Credits Required",
          description: "Please add credits to your workspace to use AI insights.",
          variant: "destructive",
        });
      }
      setAdvice("Unable to generate insights at this time. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card h-fit">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Overview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Overview
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Today's Inflow</span>
              <span className="font-semibold text-green-600">
                +${dailyInflow.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Today's Outflow</span>
              <span className="font-semibold text-red-600">
                -${dailyOutflow.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
              <span className="font-medium">Net Daily</span>
              <span className={`font-bold ${healthStatus === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                {netDaily >= 0 ? '+' : ''}${netDaily.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Alert */}
        {upcomingExpenses > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Upcoming Expenses
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                ${upcomingExpenses.toLocaleString()} due in next 7 days
              </p>
            </div>
          </div>
        )}

        {/* AI Advice */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Recommendations
          </h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {advice}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
