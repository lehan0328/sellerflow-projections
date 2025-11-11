import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertCircle, MessageSquare, CheckCircle, XCircle, User } from "lucide-react";
import { TicketMessagesDialog } from "./TicketMessagesDialog";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  user_email?: string;
  user_company?: string;
  user_role?: string;
  claimed_by?: string;
  claimed_by_name?: string | null;
}

interface AllCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function AllCasesDialog({ open, onOpenChange }: AllCasesDialogProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);

  useEffect(() => {
    if (open) {
      loadTickets();
    }
  }, [open]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('get-admin-support-tickets', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;
      setTickets(data?.tickets || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMessages = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowMessagesDialog(true);
  };

  const newTickets = tickets.filter(t => !t.claimed_by && t.status !== 'closed' && t.status !== 'resolved');
  const awaitingResponseTickets = tickets.filter(t => t.claimed_by && (t.status === 'open' || t.status === 'in_progress'));
  const needsResponseTickets = tickets.filter(t => t.claimed_by && t.status === 'needs_response');
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  const renderTicketList = (ticketList: Ticket[]) => (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-3">
        {ticketList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tickets in this category
          </div>
        ) : (
          ticketList.map((ticket) => (
            <Card key={ticket.id} className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm">{ticket.subject}</h4>
                      <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                        {ticket.priority}
                      </Badge>
                      {ticket.category && (
                        <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                      )}
                    </div>
                    
                    {/* User info */}
                    <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                      {ticket.user_email && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.user_email}
                        </span>
                      )}
                      {ticket.user_company && (
                        <span>{ticket.user_company}</span>
                      )}
                      {ticket.user_role && (
                        <Badge variant="secondary" className="text-xs">
                          {ticket.user_role}
                        </Badge>
                      )}
                    </div>

                    {/* Assignment */}
                    {ticket.claimed_by_name && (
                      <div className="mb-2">
                        <Badge variant="default" className="text-xs">
                          Assigned to: {ticket.claimed_by_name}
                        </Badge>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">{ticket.message}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(ticket.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewMessages(ticket)}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>All Support Cases</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading tickets...
            </div>
          ) : (
            <Tabs defaultValue="new" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="new">
                  New ({newTickets.length})
                </TabsTrigger>
                <TabsTrigger value="awaiting">
                  Awaiting Response ({awaitingResponseTickets.length})
                </TabsTrigger>
                <TabsTrigger value="needs">
                  Need Response ({needsResponseTickets.length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedTickets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new">
                {renderTicketList(newTickets)}
              </TabsContent>

              <TabsContent value="awaiting">
                {renderTicketList(awaitingResponseTickets)}
              </TabsContent>

              <TabsContent value="needs">
                {renderTicketList(needsResponseTickets)}
              </TabsContent>

              <TabsContent value="closed">
                {renderTicketList(closedTickets)}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {selectedTicket && (
        <TicketMessagesDialog
          ticket={selectedTicket}
          open={showMessagesDialog}
          onOpenChange={(open) => {
            setShowMessagesDialog(open);
            if (!open) {
              setSelectedTicket(null);
              loadTickets(); // Refresh tickets when closing
            }
          }}
        />
      )}
    </>
  );
}
