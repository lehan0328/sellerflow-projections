import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, TrendingUp, AlertCircle, Loader2, MessageCircle, Send, Pencil, Check, X, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreditCards } from "@/hooks/useCreditCards";
interface CashFlowInsightsProps {
  currentBalance: number;
  dailyInflow: number;
  dailyOutflow: number;
  upcomingExpenses: number;
  events?: any[];
  vendors?: any[];
  income?: any[];
  safeSpendingLimit?: number;
  reserveAmount?: number;
  projectedLowestBalance?: number;
  lowestBalanceDate?: string;
  onUpdateReserveAmount?: (amount: number) => Promise<void>;
}
export const CashFlowInsights = ({
  currentBalance,
  dailyInflow,
  dailyOutflow,
  upcomingExpenses,
  events = [],
  vendors = [],
  income = [],
  safeSpendingLimit = 0,
  reserveAmount = 0,
  projectedLowestBalance = 0,
  lowestBalanceDate = "",
  onUpdateReserveAmount
}: CashFlowInsightsProps) => {
  const {
    toast
  } = useToast();
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const [chatMode, setChatMode] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isEditingReserve, setIsEditingReserve] = useState(false);
  const [editReserveValue, setEditReserveValue] = useState(reserveAmount.toString());
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>(() => {
    // Load conversation history from localStorage on mount
    const saved = localStorage.getItem('cashflow-chat-history');
    return saved ? JSON.parse(saved) : [];
  });
  const netDaily = dailyInflow - dailyOutflow;
  const healthStatus = netDaily >= 0 ? "positive" : "negative";

  // Update edit value when reserveAmount prop changes
  useEffect(() => {
    setEditReserveValue(reserveAmount.toString());
  }, [reserveAmount]);
  const handleSaveReserve = async () => {
    const newAmount = parseFloat(editReserveValue);
    if (isNaN(newAmount) || newAmount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }
    if (onUpdateReserveAmount) {
      try {
        await onUpdateReserveAmount(newAmount);
        setIsEditingReserve(false);
        toast({
          title: "Reserve amount updated",
          description: `Your reserve is now set to $${newAmount.toLocaleString()}`
        });
      } catch (error) {
        toast({
          title: "Error updating reserve",
          description: "Please try again",
          variant: "destructive"
        });
      }
    }
  };
  const handleCancelEdit = () => {
    setEditReserveValue(reserveAmount.toString());
    setIsEditingReserve(false);
  };

  // Save conversation history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cashflow-chat-history', JSON.stringify(conversationHistory));
  }, [conversationHistory]);
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    const currentQuestion = chatQuestion.trim();

    // Add user message to history immediately
    setConversationHistory(prev => [...prev, {
      role: 'user',
      content: currentQuestion
    }]);
    setChatQuestion(""); // Clear input field
    setChatLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data,
        error
      } = await supabase.functions.invoke("cash-flow-chat", {
        body: {
          question: currentQuestion,
          userId: user.id,
          conversationHistory: conversationHistory
        }
      });
      if (error) throw error;
      if (data?.answer) {
        // Add assistant response to history
        setConversationHistory(prev => [...prev, {
          role: 'assistant',
          content: data.answer
        }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = "Unable to get an answer. Please try again later.";

      // Add error message to history
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setChatLoading(false);
    }
  };
  return <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </div>
          <div className="flex items-center gap-2">
            <Button variant={chatMode ? "default" : "ghost"} size="sm" onClick={() => setChatMode(!chatMode)}>
              <MessageCircle className="h-4 w-4 mr-1" />
              {chatMode ? "Back" : "Chat"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-auto">
        {chatMode ? <div className="flex flex-col h-full space-y-4">
            {/* Conversation History */}
            {conversationHistory.length > 0 && <ScrollArea className="flex-1 h-[400px]">
                <div className="space-y-3 pr-4">
                  {conversationHistory.map((message, index) => <div key={index} className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>)}
                  {chatLoading && <div className="flex items-center gap-2 p-3 bg-muted mr-8 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>}
                </div>
              </ScrollArea>}

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="space-y-3 flex-shrink-0">
              <div className="flex gap-2">
                <Input placeholder="Ask about your cash flow..." value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} disabled={chatLoading} className="flex-1" />
                <Button type="submit" disabled={chatLoading || !chatQuestion.trim()} size="icon">
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {conversationHistory.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => {
            setConversationHistory([]);
            localStorage.removeItem('cashflow-chat-history');
          }} className="w-full">
                  Clear Chat History
                </Button>}
            </form>
          </div> : <>
            {/* Safe Spending Power */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Safe Spending Power
              </h4>
              <div className="space-y-3">
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Available to Spend</span>
                    <span className="text-2xl font-bold text-primary">
                      ${safeSpendingLimit.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is what you can safely spend without risking shortfalls
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Reserve Amount</span>
                  {isEditingReserve ? <div className="flex items-center gap-2">
                      <Input type="number" value={editReserveValue} onChange={e => setEditReserveValue(e.target.value)} className="h-7 w-24 text-right" min="0" step="100" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveReserve}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div> : <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-600">
                        -${reserveAmount.toLocaleString()}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingReserve(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>}
                </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Lowest Projected</span>
                    <span className="font-semibold text-orange-600">
                      ${projectedLowestBalance.toLocaleString()}
                    </span>
                  </div>
                  {lowestBalanceDate && <p className="text-xs text-muted-foreground italic p-2">
                      Your balance will reach its lowest point on {new Date(lowestBalanceDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
                    </p>}
                </div>
              </div>
            </div>

            {/* Upcoming Alert */}
            {upcomingExpenses > 0}

            {/* Credit Card Spending Power */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Card Spending Power
              </h4>
              {cardsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : creditCards.length === 0 ? (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">No credit cards added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {creditCards.map((card) => {
                    const availableSpend = card.available_credit;
                    const usedCredit = card.credit_limit - card.available_credit;
                    
                    return (
                      <div key={card.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{card.account_name}</p>
                            <p className="text-xs text-muted-foreground">{card.institution_name}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Credit Limit</span>
                            <span className="font-medium">${card.credit_limit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pending Orders</span>
                            <span className="font-medium text-orange-600">-${usedCredit.toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-border my-1" />
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Available Spend</span>
                            <span className="text-lg font-bold text-green-600">
                              ${availableSpend.toLocaleString()}
                            </span>
                          </div>
                          {card.payment_due_date && (
                            <p className="text-[10px] text-muted-foreground italic mt-1">
                              Payment due: {new Date(card.payment_due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>}
      </CardContent>
    </Card>;
};