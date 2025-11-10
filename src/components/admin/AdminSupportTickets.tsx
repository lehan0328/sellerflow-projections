import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useSupportTickets } from "@/hooks/useSupportTickets";
import { CheckCircle, Clock, AlertCircle, XCircle, MessageSquare, RefreshCw } from "lucide-react";
import { TicketMessagesDialog } from "./TicketMessagesDialog";
import { supabase } from "@/integrations/supabase/client";

const statusIcons = {
  open: <Clock className="h-4 w-4" />,
  in_progress: <AlertCircle className="h-4 w-4" />,
  needs_response: <AlertCircle className="h-4 w-4 text-orange-500" />,
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
  const { tickets, isLoading, updateTicket, refetch } = useSupportTickets(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [ticketView, setTicketView] = useState<'open' | 'needs_response' | 'closed'>('needs_response');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchMessageCounts = async () => {
      if (!tickets.length) return;
      
      const counts: Record<string, number> = {};
      
      for (const ticket of tickets) {
        // Count only customer messages created after admin last viewed
        const ticketData = ticket as any;
        const cutoffDate = ticketData.admin_last_viewed_at || ticket.created_at;
        
        console.log(`Ticket ${ticket.id}: admin_last_viewed_at =`, ticketData.admin_last_viewed_at, 'cutoff =', cutoffDate);
        
        const { count, error } = await supabase
          .from('ticket_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .eq('user_id', ticket.user_id)
          .gte('created_at', cutoffDate);
        
        if (error) {
          console.error('Error fetching message count:', error);
        }
        
        console.log(`Ticket ${ticket.id}: unread count =`, count);
        counts[ticket.id] = count || 0;
      }
      
      setMessageCounts(counts);
    };
    
    fetchMessageCounts();
  }, [tickets]);

  const handleCloseTicket = async (ticketId: string) => {
    await updateTicket(ticketId, { status: 'closed' });
    await refetch();
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
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

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const needsResponseTickets = tickets.filter(t => t.status === 'needs_response');
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
  
  const displayedTickets = 
    ticketView === 'open' ? openTickets :
    ticketView === 'needs_response' ? needsResponseTickets :
    closedTickets;

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Support Tickets</CardTitle>
        <div className="flex gap-2 items-center">
          <Button
            variant={ticketView === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTicketView('open')}
          >
            Open ({openTickets.length})
          </Button>
          <Button
            variant={ticketView === 'needs_response' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTicketView('needs_response')}
          >
            Need Response ({needsResponseTickets.length})
          </Button>
          <Button
            variant={ticketView === 'closed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTicketView('closed')}
          >
            Closed ({closedTickets.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {ticketView === 'open' ? 'open' : ticketView === 'needs_response' ? 'tickets needing response' : 'closed'} tickets
            </div>
          ) : (
            displayedTickets.map((ticket) => (
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
                      
                      {/* User information */}
                      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                        {ticket.user_email && (
                          <span className="flex items-center gap-1">
                            <strong>Email:</strong> {ticket.user_email}
                          </span>
                        )}
                        {ticket.user_role && (
                          <Badge variant="secondary" className="text-xs">
                            {ticket.user_role}
                          </Badge>
                        )}
                        {ticket.user_company && (
                          <span className="flex items-center gap-1">
                            <strong>Company:</strong> {ticket.user_company}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{ticket.message}</p>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(ticket.created_at).toLocaleString()}
                        {ticket.resolved_at && ticketView === 'closed' && (
                          <> • Resolved: {new Date(ticket.resolved_at).toLocaleString()}</>
                        )}
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
                            variant="destructive" 
                            className="ml-2 h-5 min-w-5 px-1.5"
                          >
                            {messageCounts[ticket.id]}
                          </Badge>
                        )}
                      </Button>
                      {ticket.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCloseTicket(ticket.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Close
                        </Button>
                      )}
                      {ticket.status === 'closed' && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Closed
                        </Badge>
                      )}
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
