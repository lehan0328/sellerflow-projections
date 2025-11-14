import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TicketFeedbackDialog } from "./TicketFeedbackDialog";

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
  const [staffName, setStaffName] = useState<string>("Support");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && ticket) {
      loadMessages();
      loadStaffName();
    }
  }, [open, ticket]);

  const loadStaffName = async () => {
    if (!ticket.claimed_by_name) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data, error } = await supabase
          .from('admin_permissions')
          .select('first_name')
          .eq('email', user.email)
          .single();
        
        if (error) {
          console.error('Error fetching staff name:', error);
        }
        
        setStaffName(data?.first_name || 'Support');
      }
    } else {
      setStaffName(ticket.claimed_by_name);
    }
  };

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

      // Status update happens automatically via database trigger
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

  const handleCloseTicket = async () => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'closed',
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (error) throw error;

      toast.success('Ticket closed successfully');
      
      // Check if there's already feedback for this ticket
      const { data: existingFeedback } = await supabase
        .from('ticket_feedback')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single();

      // Show feedback dialog only if no feedback exists yet
      if (!existingFeedback && ticket.claimed_by) {
        setShowFeedbackDialog(true);
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket');
    }
  };

  const handleFeedbackComplete = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{ticket.subject}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{ticket.status.replace('_', ' ')}</Badge>
            <Badge variant="outline">{ticket.priority}</Badge>
            {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Original ticket message */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg flex-shrink-0">
            <p className="text-sm font-medium mb-2">Original Message:</p>
            <p className="text-sm text-muted-foreground">{ticket.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 pr-4 pb-4">
              {messages.map((msg) => {
                const isAdminMessage = msg.user_id !== ticket.user_id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isAdminMessage ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAdminMessage ? 'bg-primary text-primary-foreground' : 'bg-muted border-2 border-border'
                    }`}>
                      {isAdminMessage ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[75%] ${
                      isAdminMessage ? 'flex flex-col items-end' : ''
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${
                        isAdminMessage ? 'text-right' : 'text-left'
                      }`}>
                        {isAdminMessage ? `${staffName} (Support)` : 'Customer'}
                      </p>
                      <div className={`rounded-lg p-3 shadow-sm ${
                        isAdminMessage 
                          ? 'bg-primary/5 border border-primary/20' 
                          : 'bg-muted border border-border'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
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
            {ticket.status === 'closed' || ticket.status === 'resolved' ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm font-medium">This ticket is closed</p>
                <p className="text-xs">No new messages can be sent</p>
              </div>
            ) : (
              <>
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
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCloseTicket}
                  >
                    Close Ticket
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSubmitting || !newMessage.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Response
                  </Button>
                </div>
              </>
            )}
            {(ticket.status === 'closed' || ticket.status === 'resolved') && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <TicketFeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        ticketId={ticket.id}
        staffId={ticket.claimed_by || ''}
        staffName={staffName}
        onComplete={handleFeedbackComplete}
      />
    </Dialog>
  );
}
