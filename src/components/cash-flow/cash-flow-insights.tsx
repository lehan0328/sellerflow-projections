import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, TrendingUp, AlertCircle, Loader2, MessageCircle, Send, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CashFlowInsightsProps {
  currentBalance: number;
  dailyInflow: number;
  dailyOutflow: number;
  upcomingExpenses: number;
  events?: any[];
  vendors?: any[];
  income?: any[];
}

export const CashFlowInsights = ({
  currentBalance,
  dailyInflow,
  dailyOutflow,
  upcomingExpenses,
  events = [],
  vendors = [],
  income = [],
}: CashFlowInsightsProps) => {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
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
        body: {},
      });

      if (error) throw error;
      if (data?.advice) setAdvice(data.advice);
    } catch (error: any) {
      console.error("Failed to generate insight:", error);
      setAdvice("Unable to generate insights at this time.");
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await generateInsight();
      toast({
        title: "Insights Updated",
        description: "Financial health analysis has been refreshed with latest data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const currentQuestion = chatQuestion.trim();
    
    // Add user message to history immediately
    setConversationHistory(prev => [...prev, { role: 'user', content: currentQuestion }]);
    setChatQuestion(""); // Clear input field
    setChatLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("cash-flow-chat", {
        body: { 
          question: currentQuestion, 
          userId: user.id,
          conversationHistory: conversationHistory
        },
      });

      if (error) throw error;

      if (data?.answer) {
        // Add assistant response to history
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = "Unable to get an answer. Please try again later.";
      
      if (error.message?.includes("429")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
        errorMessage = "Rate limit reached. Please try again in a moment.";
      } else if (error.message?.includes("402")) {
        toast({
          title: "Credits Required",
          description: "Please add credits to your workspace to use AI chat.",
          variant: "destructive",
        });
        errorMessage = "Credits required. Please add credits to continue.";
      }
      
      // Add error message to history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: errorMessage }]);
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh insights with latest data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant={chatMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setChatMode(!chatMode)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {chatMode ? "Back" : "Chat"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-auto">
        {chatMode ? (
          <div className="flex flex-col h-full space-y-4">
            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {conversationHistory.map((message, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary/10 ml-8' 
                        : 'bg-muted mr-8'
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 p-3 bg-muted mr-8 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                )}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="space-y-3 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about your cash flow..."
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={chatLoading || !chatQuestion.trim()} size="icon">
                  {chatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {conversationHistory.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConversationHistory([])}
                  className="w-full"
                >
                  Clear Chat History
                </Button>
              )}
            </form>
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
