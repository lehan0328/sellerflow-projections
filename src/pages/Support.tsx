import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Clock, CheckCircle2, AlertCircle, Bot, User, Home, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { TicketDetailDialog } from "@/components/TicketDetailDialog";

type ChatMessage = { role: "user" | "assistant"; content: string };

const Support = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showAIChat, setShowAIChat] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketViewMode, setTicketViewMode] = useState<'open' | 'closed'>('open');
  
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high",
    category: "technical"
  });

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI support assistant. I can help answer questions about Auren features, troubleshooting, and more. Try asking me first before submitting a ticket - I might be able to help you right away! 🚀"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    
    // Add user message
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: userMessage }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (response.status === 429) {
        toast.error("Too many requests. Please wait a moment and try again.");
        setChatMessages(prev => prev.slice(0, -1));
        return;
      }

      if (response.status === 402) {
        toast.error("AI service temporarily unavailable. Please submit a ticket.");
        setChatMessages(prev => prev.slice(0, -1));
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      // Add assistant message placeholder
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get AI response. Please try again.");
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim() || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Create ticket without auth requirement
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: session?.user?.id || null,
          subject: formData.subject,
          message: formData.message,
          priority: formData.priority,
          category: formData.category || null,
          status: 'needs_response'
        });
      
      if (error) throw error;
      
      toast.success("Support ticket created successfully! We'll get back to you soon.");
      setFormData({
        subject: "",
        message: "",
        priority: "medium",
        category: "technical"
      });
      setShowNewTicket(false);
      
      // Reload tickets if user is logged in
      if (session?.user) {
        loadTickets();
      }
    } catch (error) {
      toast.error("Failed to create support ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTickets = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Get tickets and check which ones have feedback
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (ticketsError || !ticketsData) {
      console.error('Error loading tickets:', ticketsError);
      return;
    }

    // Get all feedback for these tickets
    const ticketIds = ticketsData.map(t => t.id);
    const { data: feedbackData } = await supabase
      .from('ticket_feedback')
      .select('ticket_id')
      .in('ticket_id', ticketIds);
    
    const feedbackTicketIds = new Set(feedbackData?.map(f => f.ticket_id) || []);
    
    // Add feedback status to tickets
    const ticketsWithFeedback = ticketsData.map(ticket => ({
      ...ticket,
      hasFeedback: feedbackTicketIds.has(ticket.id),
      needsFeedback: (ticket.status === 'closed' || ticket.status === 'resolved') && 
                     ticket.claimed_by && 
                     !feedbackTicketIds.has(ticket.id)
    }));
    
    setTickets(ticketsWithFeedback);
  };

  // Check if user has any open tickets
  const hasOpenTicket = tickets.some(
    ticket => ticket.status === 'open' || 
              ticket.status === 'in_progress' || 
              ticket.status === 'needs_response'
  );

  // Filter tickets based on view mode
  const filteredTickets = tickets.filter(ticket => {
    const isOpen = ticket.status === 'open' || 
                   ticket.status === 'in_progress' || 
                   ticket.status === 'needs_response';
    return ticketViewMode === 'open' ? isOpen : !isOpen;
  });

  const openTicketsCount = tickets.filter(ticket => 
    ticket.status === 'open' || 
    ticket.status === 'in_progress' || 
    ticket.status === 'needs_response'
  ).length;

  const closedTicketsCount = tickets.filter(ticket => 
    ticket.status === 'resolved' || 
    ticket.status === 'closed'
  ).length;

  useEffect(() => {
    loadTickets();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "in_progress":
        return "secondary";
      case "resolved":
        return "outline";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowTicketDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 animate-fade-in">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Support</h1>
            <p className="text-muted-foreground">Get help with Auren features and your account</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAIChat(!showAIChat)}
            >
              <Bot className="h-4 w-4 mr-2" />
              {showAIChat ? "Hide" : "Show"} AI Assistant
            </Button>
            {user ? (
              <Button 
                onClick={() => {
                  if (hasOpenTicket) {
                    toast.error("You already have an open ticket. Please wait for it to be resolved before creating a new one.");
                  } else {
                    setShowNewTicket(!showNewTicket);
                  }
                }}
                disabled={hasOpenTicket}
              >
                <Send className="h-4 w-4 mr-2" />
                {hasOpenTicket ? "Open Ticket Pending" : "New Ticket"}
              </Button>
            ) : (
              <Button asChild>
                <a href="mailto:support@aurenapp.com">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Support
                </a>
              </Button>
            )}
          </div>
          </div>

          {/* AI Chat Assistant */}
          {showAIChat && (
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle>AI Support Assistant</CardTitle>
                </div>
                <CardDescription>
                  Ask me anything about Auren! I can help with features, troubleshooting, and general questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ScrollArea className="h-[400px] rounded-lg border p-4">
                    <div className="space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start space-x-2 ${
                            msg.role === "user" ? "justify-end" : ""
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`rounded-lg p-3 max-w-[80%] ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.role === "user" && (
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Bot className="h-4 w-4 animate-pulse" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <form onSubmit={handleChatSubmit} className="flex space-x-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything about Auren..."
                      disabled={isChatLoading}
                    />
                    <Button type="submit" disabled={isChatLoading || !chatInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Ticket Form - Only for authenticated users */}
          {!user && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>
                  Get help from our support team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  For support inquiries, please email us at:
                </p>
                <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  <a 
                    href="mailto:support@aurenapp.com" 
                    className="text-lg font-semibold text-primary hover:underline"
                  >
                    support@aurenapp.com
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24-48 hours. For faster support, try asking our AI assistant above first!
                </p>
              </CardContent>
            </Card>
          )}

          {/* New Ticket Form - Only for authenticated users */}
          {user && showNewTicket && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Create Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and we'll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: "low" | "medium" | "high") =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                        required
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="bug">Report a Bug</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="connection">Amazon/Plaid Connection Issues</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Provide detailed information about your issue..."
                      rows={6}
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewTicket(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Ticket"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Tickets List - Only for authenticated users */}
          {user && (
            <Card className="shadow-card border-0">
              <CardHeader className="bg-gradient-to-r from-background to-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Your Support Tickets</CardTitle>
                    <CardDescription className="text-base mt-1">
                      View and track your support requests
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0 border rounded-md">
                      <Button
                        variant={ticketViewMode === 'open' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTicketViewMode('open')}
                        className="rounded-r-none border-r"
                      >
                        Open ({openTicketsCount})
                      </Button>
                      <Button
                        variant={ticketViewMode === 'closed' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTicketViewMode('closed')}
                        className="rounded-l-none"
                      >
                        Closed ({closedTicketsCount})
                      </Button>
                    </div>
                    {tickets.length > 0 && (
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 border-b">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-16 animate-fade-in">
                    <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <MessageSquare className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {ticketViewMode === 'open' ? 'No open support tickets' : 'No closed support tickets'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {ticketViewMode === 'open' 
                        ? 'Create your first support ticket to get help from our team'
                        : 'Your resolved and closed tickets will appear here'
                      }
                    </p>
                    {ticketViewMode === 'open' && (
                      <Button 
                        onClick={() => setShowNewTicket(true)}
                        className="hover-scale"
                        disabled={hasOpenTicket}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Create Ticket
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredTickets.map((ticket, index) => (
                      <div
                        key={ticket.id}
                        className="group relative rounded-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => handleViewTicket(ticket)}
                      >
                        {/* Status indicator bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all duration-300 ${
                          ticket.status === 'open' || ticket.status === 'in_progress' ? 'bg-blue-500' :
                          ticket.status === 'needs_response' ? 'bg-orange-500' :
                          ticket.status === 'resolved' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Header with icon and title */}
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 rounded-lg p-2 ${
                                ticket.status === 'open' || ticket.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                                ticket.status === 'needs_response' ? 'bg-orange-500/10 text-orange-600' :
                                ticket.status === 'resolved' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'
                              }`}>
                                {getStatusIcon(ticket.status)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    #{ticket.ticket_number}
                                  </Badge>
                                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                    {ticket.subject}
                                  </h3>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {ticket.message}
                                </p>
                              </div>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge 
                                variant={getStatusColor(ticket.status)}
                                className="font-medium"
                              >
                                {ticket.status.replace("_", " ").toUpperCase()}
                              </Badge>
                              <Badge 
                                variant={getPriorityColor(ticket.priority)}
                                className="font-medium"
                              >
                                {ticket.priority.toUpperCase()}
                              </Badge>
                              {ticket.category && (
                                <Badge variant="outline" className="font-medium">
                                  {ticket.category}
                                </Badge>
                              )}
                              {ticket.needsFeedback && (
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium animate-pulse">
                                  ⭐ Rate Support
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Date info */}
                          <div className="text-right space-y-1 min-w-[140px]">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Created
                            </div>
                            <div className="text-sm font-semibold text-foreground">
                              {formatDate(ticket.created_at)}
                            </div>
                            {ticket.resolved_at && (
                              <>
                                <div className="text-xs font-medium text-green-600 uppercase tracking-wide mt-2">
                                  Resolved
                                </div>
                                <div className="text-sm font-semibold text-green-600">
                                  {formatDate(ticket.resolved_at)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Hover indicator */}
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-xs text-primary font-medium flex items-center gap-1">
                            Click to view
                            <MessageSquare className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

           {selectedTicket && (
             <TicketDetailDialog
               ticket={selectedTicket}
               open={showTicketDialog}
               onOpenChange={setShowTicketDialog}
             />
           )}
         </div>
       </div>
   );
};

export default Support;
