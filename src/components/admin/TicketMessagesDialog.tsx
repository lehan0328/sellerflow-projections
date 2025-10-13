import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketMessagesDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketMessagesDialog({ ticket, open, onOpenChange }: TicketMessagesDialogProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && ticket) {
      loadMessages();
    }
  }, [open, ticket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      return;
    }

    setMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          message: newMessage.trim(),
          is_internal: false
        });

      if (error) throw error;

      setNewMessage("");
      await loadMessages();
      toast.success('Response sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{ticket.subject}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{ticket.status.replace('_', ' ')}</Badge>
              <Badge variant="outline">{ticket.priority}</Badge>
              {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Original ticket message */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Original Message:</p>
            <p className="text-sm text-muted-foreground">{ticket.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((msg) => {
                const isAdminMessage = msg.user_id !== ticket.user_id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isAdminMessage ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAdminMessage ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {isAdminMessage ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[80%] ${
                      isAdminMessage ? '' : 'flex flex-col items-end'
                    }`}>
                      <div className={`rounded-lg p-3 ${
                        isAdminMessage 
                          ? 'bg-primary/10 text-foreground' 
                          : 'bg-muted text-foreground'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Reply form */}
          <div className="mt-4 space-y-3 border-t pt-4">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your response..."
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isSubmitting || !newMessage.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Response
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
