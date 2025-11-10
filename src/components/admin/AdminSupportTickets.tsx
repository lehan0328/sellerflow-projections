import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { MessageSquare, RefreshCw } from "lucide-react";
import { TicketMessagesDialog } from "./TicketMessagesDialog";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const priorityColors = {
  low: "bg-gray-500/10 text-gray-600",
  medium: "bg-blue-500/10 text-blue-600",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-red-500/10 text-red-600"
};

type ColumnId = 'open' | 'needs_response' | 'closed';

const columns: { id: ColumnId; title: string; statuses: string[] }[] = [
  { id: 'open', title: 'Open', statuses: ['open', 'in_progress'] },
  { id: 'needs_response', title: 'Needs Response', statuses: ['needs_response'] },
  { id: 'closed', title: 'Closed', statuses: ['resolved', 'closed'] },
];

interface SortableTicketProps {
  ticket: any;
  messageCounts: Record<string, number>;
  onViewMessages: (ticket: any) => void;
}

const SortableTicket = ({ ticket, messageCounts, onViewMessages }: SortableTicketProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-3 cursor-move hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2 truncate">{ticket.subject}</h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={priorityColors[ticket.priority]}>
                    {ticket.priority}
                  </Badge>
                  {ticket.category && (
                    <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                  )}
                </div>
                
                {ticket.user_email && (
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    {ticket.user_email}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{ticket.message}</p>
                <div className="text-xs text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMessages(ticket);
                }}
                className="relative flex-shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                {messageCounts[ticket.id] > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
                  >
                    {messageCounts[ticket.id]}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdminSupportTickets = () => {
  const { tickets, isLoading, updateTicket, refetch } = useSupportTickets(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newColumnId = over.id as ColumnId;
    
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Determine new status based on column
    let newStatus: string;
    if (newColumnId === 'open') {
      newStatus = 'open';
    } else if (newColumnId === 'needs_response') {
      newStatus = 'needs_response';
    } else {
      newStatus = 'closed';
    }

    // Skip if status hasn't changed
    const column = columns.find(c => c.statuses.includes(ticket.status));
    if (column?.id === newColumnId) return;

    const updates: any = { status: newStatus };
    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }
    
    await updateTicket(ticketId, updates);
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


  const getTicketsForColumn = (columnId: ColumnId) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return [];
    return tickets.filter(t => column.statuses.includes(t.status));
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

  const activeTicket = activeId ? tickets.find(t => t.id === activeId) : null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Support Tickets</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-3 gap-4">
              {columns.map((column) => {
                const columnTickets = getTicketsForColumn(column.id);
                return (
                  <SortableContext
                    key={column.id}
                    id={column.id}
                    items={columnTickets.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col">
                      <div className="mb-4 pb-2 border-b">
                        <h3 className="font-semibold text-sm flex items-center justify-between">
                          {column.title}
                          <Badge variant="secondary">{columnTickets.length}</Badge>
                        </h3>
                      </div>
                      <div className="flex-1 min-h-[500px] bg-muted/20 rounded-lg p-3">
                        {columnTickets.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            No tickets
                          </div>
                        ) : (
                          columnTickets.map((ticket) => (
                            <SortableTicket
                              key={ticket.id}
                              ticket={ticket}
                              messageCounts={messageCounts}
                              onViewMessages={handleViewMessages}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </SortableContext>
                );
              })}
            </div>

            <DragOverlay>
              {activeTicket ? (
                <Card className="cursor-grabbing opacity-90 shadow-lg">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2 truncate">{activeTicket.subject}</h3>
                    <Badge className={priorityColors[activeTicket.priority]}>
                      {activeTicket.priority}
                    </Badge>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
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
