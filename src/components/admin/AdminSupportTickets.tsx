import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { CheckCircle, Clock, AlertCircle, XCircle, MessageSquare } from "lucide-react";
import { TicketMessagesDialog } from "./TicketMessagesDialog";
import { supabase } from "@/integrations/supabase/client";

const statusIcons = {
  open: <Clock className="h-4 w-4" />,
  in_progress: <AlertCircle className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  closed: <XCircle className="h-4 w-4" />
};

const priorityColors = {
  low: "bg-gray-500/10 text-gray-600",
  medium: "bg-blue-500/10 text-blue-600",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-red-500/10 text-red-600"
};

export const AdminSupportTickets = () => {
  const { tickets, isLoading, updateTicket } = useSupportTickets(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchMessageCounts = async () => {
      if (!tickets.length) return;
      
      const counts: Record<string, number> = {};
      
      for (const ticket of tickets) {
        // Count only customer messages created after admin last viewed
        const ticketData = ticket as any;
        const { count } = await supabase
          .from('ticket_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .eq('user_id', ticket.user_id)
          .gte('created_at', ticketData.admin_last_viewed_at || ticket.created_at);
        
        counts[ticket.id] = count || 0;
      }
      
      setMessageCounts(counts);
    };
    
    fetchMessageCounts();
  }, [tickets]);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }
    await updateTicket(ticketId, updates);
  };

  const handleViewMessages = async (ticket: any) => {
    setSelectedTicket(ticket);
    setShowMessagesDialog(true);
    
    // Mark as viewed by admin
    await supabase
      .from('support_tickets')
      .update({ admin_last_viewed_at: new Date().toISOString() })
      .eq('id', ticket.id);
    
    // Reset the count for this ticket
    setMessageCounts(prev => ({ ...prev, [ticket.id]: 0 }));
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading tickets...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle>Support Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No support tickets found
            </div>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{ticket.subject}</h3>
                        <Badge className={priorityColors[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                        {ticket.category && (
                          <Badge variant="outline">{ticket.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{ticket.message}</p>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(ticket.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewMessages(ticket)}
                        className="relative"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Messages
                        {messageCounts[ticket.id] > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="ml-2 h-5 min-w-5 px-1.5 bg-primary text-primary-foreground"
                          >
                            {messageCounts[ticket.id]}
                          </Badge>
                        )}
                      </Button>
                      {statusIcons[ticket.status]}
                      <Select 
                        value={ticket.status} 
                        onValueChange={(value) => handleStatusChange(ticket.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>

    {selectedTicket && (
      <TicketMessagesDialog
        ticket={selectedTicket}
        open={showMessagesDialog}
        onOpenChange={setShowMessagesDialog}
      />
    )}
    </>
  );
};
