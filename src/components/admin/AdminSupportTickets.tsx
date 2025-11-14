import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useAdmin } from "@/hooks/useAdmin";
import { CheckCircle, Clock, AlertCircle, XCircle, MessageSquare, RefreshCw, UserPlus, UserCheck, X, BarChart3 } from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { tickets, isLoading, updateTicket, refetch } = useSupportTickets(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [ticketView, setTicketView] = useState<'new' | 'open' | 'needs_response' | 'closed'>('new');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { userRole } = useAdmin();
  const [ticketFeedback, setTicketFeedback] = useState<Record<string, { rating: number; comment?: string }>>({});
  
  // Staff dashboard metrics
  const [totalNew, setTotalNew] = useState(0);
  const [myNeedsResponse, setMyNeedsResponse] = useState(0);
  const [myOpen, setMyOpen] = useState(0);
  const [myClaimed, setMyClaimed] = useState(0);
  const [myClosed, setMyClosed] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get staff filter from URL params
  const filteredStaffId = searchParams.get('staffId');
  const filteredStaffName = searchParams.get('staffName');

  const clearStaffFilter = () => {
    searchParams.delete('staffId');
    searchParams.delete('staffName');
    setSearchParams(searchParams);
  };

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Calculate dashboard metrics
  useEffect(() => {
    if (!tickets.length || !currentUserId) return;

    const newCount = tickets.filter(t => !(t as any).claimed_by && t.status !== 'closed' && t.status !== 'resolved').length;
    const myNeedsResponseCount = tickets.filter(t => (t as any).claimed_by === currentUserId && t.status === 'needs_response').length;
    const myOpenCount = tickets.filter(t => (t as any).claimed_by === currentUserId && (t.status === 'open' || t.status === 'in_progress')).length;
    const myClaimedCount = tickets.filter(t => (t as any).claimed_by === currentUserId).length;
    const myClosedCount = tickets.filter(t => (t as any).claimed_by === currentUserId && (t.status === 'closed' || t.status === 'resolved')).length;

    setTotalNew(newCount);
    setMyNeedsResponse(myNeedsResponseCount);
    setMyOpen(myOpenCount);
    setMyClaimed(myClaimedCount);
    setMyClosed(myClosedCount);
  }, [tickets, currentUserId]);

  useEffect(() => {
    const fetchMessageCounts = async () => {
      if (!tickets.length) return;
      
      const counts: Record<string, number> = {};
      
      for (const ticket of tickets) {
        // Count only customer messages created after admin last viewed
        const ticketData = ticket as any;
        const cutoffDate = ticketData.admin_last_viewed_at || ticket.created_at;
        
        const { count, error } = await supabase
          .from('ticket_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .eq('user_id', ticket.user_id)
          .gte('created_at', cutoffDate);
        
        if (error) {
          console.error('Error fetching message count:', error);
        }
        
        counts[ticket.id] = count || 0;
      }
      
      setMessageCounts(counts);
    };
    
    fetchMessageCounts();
  }, [tickets]);

  // Fetch feedback for tickets
  useEffect(() => {
    const fetchTicketFeedback = async () => {
      if (!tickets.length) return;
      
      const feedback: Record<string, { rating: number; comment?: string }> = {};
      
      for (const ticket of tickets) {
        const { data, error } = await supabase
          .from('ticket_feedback')
          .select('rating, comment')
          .eq('ticket_id', ticket.id)
          .single();
        
        if (!error && data) {
          feedback[ticket.id] = data;
        }
      }
      
      setTicketFeedback(feedback);
    };
    
    fetchTicketFeedback();
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

  const handleClaimTicket = async (ticketId: string, ticketSubject: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Must be logged in to claim tickets");
      return;
    }

    // Get staff name from admin_permissions
    const { data: adminPerm, error: permError } = await supabase
      .from('admin_permissions')
      .select('first_name')
      .eq('email', user.email)
      .single();

    if (permError) {
      console.error("Error fetching staff name:", permError);
    }

    const staffName = adminPerm?.first_name || 'Support';

    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
        status: 'needs_response' // Keep as needs_response until staff types actual response
      })
      .eq('id', ticketId);

    if (error) {
      toast.error("Failed to claim ticket");
      console.error("Error claiming ticket:", error);
      return;
    }

    // Send automatic greeting message to customer
    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: `Hello, my name is ${staffName}. I will be assisting you with this case today. Please give me a few minutes to take a look at your case.`,
        is_internal: false
      });

    if (messageError) {
      console.error("Error sending greeting message:", messageError);
    }

    toast.success("Ticket claimed successfully");
    await refetch();
    
    // Automatically open the ticket messages dialog
    const claimedTicket = tickets.find(t => t.id === ticketId);
    if (claimedTicket) {
      // Update the ticket with claimed_by info for the dialog
      const updatedTicket = {
        ...claimedTicket,
        claimed_by: user.id,
        claimed_by_name: staffName,
        status: 'needs_response'
      };
      handleViewMessages(updatedTicket);
    }
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

  // Apply staff filter first if present
  const staffFilteredTickets = filteredStaffId
    ? tickets.filter(t => (t as any).claimed_by === filteredStaffId)
    : tickets;

  const newTickets = staffFilteredTickets.filter(t => !(t as any).claimed_by && t.status !== 'closed' && t.status !== 'resolved');
  const openTickets = staffFilteredTickets.filter(t => (t as any).claimed_by && (t.status === 'open' || t.status === 'in_progress'));
  const needsResponseTickets = staffFilteredTickets.filter(t => (t as any).claimed_by && t.status === 'needs_response');
  const closedTickets = staffFilteredTickets.filter(t => t.status === 'resolved' || t.status === 'closed');
  
  const displayedTickets = 
    ticketView === 'new' ? newTickets :
    ticketView === 'open' ? openTickets :
    ticketView === 'needs_response' ? needsResponseTickets :
    closedTickets;

  return (
    <div className="space-y-4">
      {/* My Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNew}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unclaimed tickets available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Response</CardTitle>
            <MessageSquare className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myNeedsResponse}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cases awaiting my reply
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Open</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myOpen}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cases in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claimed</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myClaimed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All my cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myClosed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Resolved cases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Filter Alert */}
      {filteredStaffId && filteredStaffName && (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertTitle>Filtered by Staff Member</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Showing tickets claimed by <strong>{decodeURIComponent(filteredStaffName)}</strong></span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearStaffFilter}
              className="ml-4"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filter
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Support Tickets</CardTitle>
        <div className="flex gap-2 items-center">
          <Button
            variant={ticketView === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTicketView('new')}
          >
            New ({newTickets.length})
          </Button>
          <Button
            variant={ticketView === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTicketView('open')}
          >
            Awaiting Response ({openTickets.length})
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
              No {ticketView === 'new' ? 'new unclaimed' : ticketView === 'open' ? 'open' : ticketView === 'needs_response' ? 'tickets needing response' : 'closed'} tickets
            </div>
          ) : (
            displayedTickets.map((ticket) => (
              <Card key={ticket.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{ticket.subject}</h3>
                        <Badge variant="outline" className="text-xs font-mono">
                          #{(ticket as any).ticket_number || ticket.id.slice(-8)}
                        </Badge>
                        <Badge className={priorityColors[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                        {ticket.category && (
                          <Badge variant="outline">{ticket.category}</Badge>
                        )}
                        {(ticket as any).claimed_by_name && (
                          <Badge variant="default" className="text-xs">
                            Assigned to: {(ticket as any).claimed_by_name}
                          </Badge>
                        )}
                        {ticket.user_role && (
                          <Badge variant="secondary" className="text-xs">
                            {ticket.user_role}
                          </Badge>
                        )}
                      </div>
                      
                      {/* User information */}
                      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                        {ticket.user_email && (
                          <span className="flex items-center gap-1">
                            <strong>Email:</strong> {ticket.user_email}
                          </span>
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
                      
                      {/* Display feedback if available */}
                      {ticketFeedback[ticket.id] && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Customer Feedback:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={star <= ticketFeedback[ticket.id].rating ? 'text-yellow-500' : 'text-gray-300'}
                                >
                                  ★
                                </span>
                              ))}
                              <span className="ml-1 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                                {ticketFeedback[ticket.id].rating}/5
                              </span>
                            </div>
                          </div>
                          {ticketFeedback[ticket.id].comment && (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                              "{ticketFeedback[ticket.id].comment}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {ticketView === 'new' && !(ticket as any).claimed_by && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleClaimTicket(ticket.id, ticket.subject)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Claim Ticket
                        </Button>
                      )}
                      {(ticket as any).claimed_by && (
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
                      )}
                      {(ticket as any).claimed_by && ticket.status !== 'closed' && (
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
    </div>
  );
};
