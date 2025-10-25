import { useState, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [message, setMessage] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Hide tooltip after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setChatAnswer("");

    try {
      const { data, error } = await supabase.functions.invoke('cash-flow-chat', {
        body: { 
          question: message,
          userId: 'demo' // Demo mode for landing page
        }
      });

      if (error) throw error;
      
      setChatAnswer(data.answer || "I'm here to help! Ask me anything about cash flow management for your ecommerce business.");
      setMessage("");
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button with Tooltip */}
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center space-x-3">
          {showTooltip && (
            <div className="bg-card border shadow-lg rounded-lg px-4 py-2 animate-fade-in">
              <p className="text-sm font-medium">Here to help! 💬</p>
            </div>
          )}
          <Button
            size="lg"
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
            className="h-14 w-14 rounded-full shadow-2xl bg-gradient-primary hover:scale-110 transition-all duration-300"
            aria-label="Open AI chat assistant"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col animate-scale-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg">
                <span className="bg-gradient-primary bg-clip-text text-transparent animate-pulse">AI</span> Assistant
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
              aria-label="Close chat assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4 p-4 overflow-hidden">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {!chatAnswer && !isLoading && (
                <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                  👋 Hi! I'm your AI cash flow assistant. Ask me anything about managing cash flow for your ecommerce business!
                </div>
              )}
              
              {isLoading && (
                <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg animate-pulse">
                  Thinking...
                </div>
              )}

              {chatAnswer && (
                <div className="space-y-3">
                  <div className="text-sm p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {chatAnswer}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about cash flow management..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !message.trim()}
                  className="bg-gradient-primary hover-scale"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Powered by AI • For demo purposes
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
};
