import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Shield, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TicketFeedbackDialog } from "./admin/TicketFeedbackDialog";

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketDetailDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailDialog({ ticket, open, onOpenChange }: TicketDetailDialogProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [staffName, setStaffName] = useState<string>("Support");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && ticket) {
      loadMessages();
      loadStaffName();
      checkForFeedback();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`ticket-${ticket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_messages',
            filter: `ticket_id=eq.${ticket.id}`
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, ticket]);

  const checkForFeedback = async () => {
    // Only prompt for feedback if ticket is already closed and was handled by staff
    if (!isTicketClosed || !ticket.claimed_by) return;

    try {
      const { data: existingFeedback } = await supabase
        .from('ticket_feedback')
        .select('id')
        .eq('ticket_id', ticket.id)
        .maybeSingle();

      // Show feedback dialog if no feedback exists yet
      if (!existingFeedback) {
        setShowFeedbackDialog(true);
      }
    } catch (error) {
      console.error('Error checking feedback:', error);
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
      .eq('is_internal', false) // Only load non-internal messages for users
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
    
    // Mark ticket as viewed by customer
    const { data: { user } } = await supabase.auth.getUser();
    if (user && ticket.user_id === user.id) {
      await supabase
        .from('support_tickets')
        .update({ customer_last_viewed_at: new Date().toISOString() })
        .eq('id', ticket.id);
    }
  };

  const loadStaffName = async () => {
    if (!ticket.claimed_by) return;
    
    // Get user email from auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(ticket.claimed_by);
    
    if (userData?.user?.email) {
      // Get staff name from admin_permissions using email
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('first_name')
        .eq('email', userData.user.email)
        .single();
      
      if (!error && data?.first_name) {
        setStaffName(data.first_name);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isTicketClosed) return;

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
      toast.success('Message sent successfully');
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
      
      // Check if there's already feedback and if ticket was claimed by staff
      const { data: existingFeedback } = await supabase
        .from('ticket_feedback')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single();

      // Show feedback dialog only if no feedback exists and ticket was claimed by staff
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
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-mono">
              #{ticket.ticket_number}
            </Badge>
            <DialogTitle className="flex-1">{ticket.subject}</DialogTitle>
          </div>
          <DialogDescription asChild>
            <span>Ticket Details</span>
          </DialogDescription>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{ticket.status.replace('_', ' ')}</Badge>
            <Badge variant="outline">{ticket.priority}</Badge>
            {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Original ticket message - acts as divider */}
          <div className="mb-3 p-3 bg-muted/50 rounded-lg flex-shrink-0 border-b-2 border-border">
            <p className="text-xs font-medium mb-1">Original Message:</p>
            <p className="text-sm text-muted-foreground">{ticket.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {isTicketClosed && (
            <Alert className="mb-3 flex-shrink-0">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This ticket is {ticket.status}. You cannot add new messages to a closed or resolved ticket.
              </AlertDescription>
            </Alert>
          )}

          {/* Messages - scrollable area */}
          <div className="flex-1 overflow-auto min-h-0">
            <div className="space-y-3 pr-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No responses yet. Our team will respond soon.
                </p>
              ) : (
                messages.map((msg) => {
                  const isUserMessage = msg.user_id === ticket.user_id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        isUserMessage ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isUserMessage ? 'bg-muted border-2 border-border' : 'bg-primary text-primary-foreground'
                      }`}>
                        {isUserMessage ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`flex-1 max-w-[75%] ${
                        isUserMessage ? 'flex flex-col items-end' : ''
                      }`}>
                        <p className={`text-xs font-semibold mb-0.5 ${
                          isUserMessage ? 'text-right' : 'text-left'
                        }`}>
                          {isUserMessage ? 'You' : 'Support Team'}
                        </p>
                        <div className={`rounded-lg p-2.5 shadow-sm ${
                          isUserMessage 
                            ? 'bg-muted border border-border' 
                            : 'bg-primary/5 border border-primary/20'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
                <div ref={messagesEndRef} />
              </div>
            </div>

          {/* Reply form - disabled if ticket is closed */}
          {!isTicketClosed && (
            <div className="mt-3 space-y-2 border-t pt-3 px-1">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                className="resize-none text-sm"
                disabled={isTicketClosed}
              />
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseTicket}
                  className="text-muted-foreground"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close Ticket
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSubmitting || !newMessage.trim() || isTicketClosed}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Show resolution notes if ticket is resolved */}
          {ticket.resolution_notes && (
            <div className="mt-3 p-3 bg-primary/5 rounded-lg border-l-4 border-primary flex-shrink-0">
              <p className="text-xs font-medium text-primary mb-1">Resolution:</p>
              <p className="text-sm text-muted-foreground">{ticket.resolution_notes}</p>
            </div>
          )}
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
