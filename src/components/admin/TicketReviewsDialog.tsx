import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TicketReview {
  id: string;
  ticket_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  ticket_number: number;
  ticket_subject: string;
  staff_name: string | null;
  user_email: string | null;
}

interface TicketReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketReviewsDialog({ open, onOpenChange }: TicketReviewsDialogProps) {
  const [reviews, setReviews] = useState<TicketReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadReviews();
    }
  }, [open]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);

      // Fetch all ticket feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('ticket_feedback')
        .select(`
          id,
          ticket_id,
          rating,
          comment,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      if (!feedbackData || feedbackData.length === 0) {
        setReviews([]);
        return;
      }

      // Fetch ticket details for all feedback
      const ticketIds = feedbackData.map(f => f.ticket_id);
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, user_id, claimed_by')
        .in('id', ticketIds);

      if (ticketsError) throw ticketsError;

      // Fetch staff names
      const { data: adminPermissions } = await supabase
        .from('admin_permissions')
        .select('email, first_name');

      // Fetch user emails
      const { data: authData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;
      const users = authData?.users || [];

      // Create mappings
      const userEmailMap = new Map<string, string>();
      users.forEach((u: any) => {
        if (u.id && u.email) userEmailMap.set(u.id, u.email);
      });

      const staffNameMap = new Map<string, string>();
      adminPermissions?.forEach((perm: any) => {
        const userId = users.find((u: any) => u.email === perm.email)?.id;
        if (userId && perm.first_name) {
          staffNameMap.set(userId, perm.first_name);
        }
      });

      // Combine all data
      const enrichedReviews = feedbackData.map(feedback => {
        const ticket = ticketsData?.find(t => t.id === feedback.ticket_id);
        return {
          ...feedback,
          ticket_number: ticket?.ticket_number || 0,
          ticket_subject: ticket?.subject || 'Unknown',
          staff_name: ticket?.claimed_by ? staffNameMap.get(ticket.claimed_by) || null : null,
          user_email: ticket?.user_id ? userEmailMap.get(ticket.user_id) || null : null,
        };
      });

      setReviews(enrichedReviews);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load ticket reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Ticket Reviews & Feedback
          </DialogTitle>
          {reviews.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <span>Total Reviews: {reviews.length}</span>
              <span className="flex items-center gap-1">
                Average Rating: 
                <span className="font-semibold text-yellow-600 dark:text-yellow-500">
                  {averageRating} ★
                </span>
              </span>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ticket reviews found
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header with case number and rating */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          #{review.ticket_number}
                        </Badge>
                        <span className="font-semibold text-sm">
                          {review.ticket_subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm font-semibold">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {review.user_email && (
                        <span>Customer: {review.user_email}</span>
                      )}
                      {review.staff_name && (
                        <span>Staff: {review.staff_name}</span>
                      )}
                      <span>
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-foreground italic">
                          "{review.comment}"
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
