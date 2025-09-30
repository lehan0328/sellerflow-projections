import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, TrendingUp, AlertCircle, Loader2, MessageCircle, Send } from "lucide-react";
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
  const [chatMode, setChatMode] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState("");
  const { toast } = useToast();

  const netDaily = dailyInflow - dailyOutflow;
  const healthStatus = netDaily >= 0 ? "positive" : "negative";

  useEffect(() => {
    fetchDailyInsight();
  }, []);

  const fetchDailyInsight = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      // Try to fetch today's insight from database
      const { data: insight, error } = await supabase
        .from("cash_flow_insights")
        .select("advice")
        .eq("user_id", user.id)
        .eq("insight_date", today)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (insight?.advice) {
        setAdvice(insight.advice);
      } else {
        // If no insight for today, generate one on-demand
        await generateInsight();
      }
    } catch (error: any) {
      console.error("Failed to fetch insight:", error);
      setAdvice("Unable to load insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const generateInsight = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("cash-flow-advice", {
        body: {
          currentBalance,
          dailyInflow,
          dailyOutflow,
          upcomingExpenses,
          chartData: events.slice(-7),
        },
      });

      if (error) throw error;
      if (data?.advice) setAdvice(data.advice);
    } catch (error: any) {
      console.error("Failed to generate insight:", error);
      setAdvice("Unable to generate insights at this time.");
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    setChatLoading(true);
    setChatAnswer("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("cash-flow-chat", {
        body: { question: chatQuestion, userId: user.id },
      });

      if (error) throw error;

      if (data?.answer) {
        setChatAnswer(data.answer);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error.message?.includes("429")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
      } else if (error.message?.includes("402")) {
        toast({
          title: "Credits Required",
          description: "Please add credits to your workspace to use AI chat.",
          variant: "destructive",
        });
      } else {
        setChatAnswer("Unable to get an answer. Please try again later.");
      }
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </div>
          <Button
            variant={chatMode ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setChatMode(!chatMode);
              if (!chatMode) {
                setChatQuestion("");
                setChatAnswer("");
              }
            }}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {chatMode ? "Back" : "Chat"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-auto">
        {chatMode ? (
          <div className="space-y-4">
            <form onSubmit={handleChatSubmit} className="space-y-3">
              <div>
                <Input
                  placeholder="Ask about your cash flow..."
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  disabled={chatLoading}
                />
              </div>
              <Button type="submit" disabled={chatLoading || !chatQuestion.trim()} className="w-full">
                {chatLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Ask AI
              </Button>
            </form>

            {chatAnswer && (
              <div className="mt-4 p-3 bg-muted rounded-lg max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                <p className="text-sm font-semibold mb-2">Answer:</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {chatAnswer}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
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
                <div 
                  className="text-sm text-muted-foreground leading-relaxed max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  dangerouslySetInnerHTML={{ 
                    __html: advice
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
