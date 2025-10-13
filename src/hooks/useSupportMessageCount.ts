import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupportMessageCount = () => {
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, customer_last_viewed_at, created_at')
        .eq('user_id', user.id);

      if (!tickets || tickets.length === 0) {
        setUnreadSupportCount(0);
        return;
      }

      let totalUnread = 0;

      // For each ticket, count admin messages created after customer last viewed
      for (const ticket of tickets) {
        const cutoffDate = ticket.customer_last_viewed_at || ticket.created_at;
        
        const { count } = await supabase
          .from('ticket_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .neq('user_id', user.id) // Messages not from the user (i.e., from admin)
          .gte('created_at', cutoffDate);

        totalUnread += count || 0;
      }

      setUnreadSupportCount(totalUnread);
    };

    fetchUnreadCount();

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('support-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadSupportCount };
};
