import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'critical' | 'update' | 'announcement' | 'maintenance' | 'new_feature' | 'bug_fix' | 'urgent' | 'legal_policy' | 'reminder' | 'security';
  category: 'payment' | 'income' | 'cash-flow' | 'amazon' | 'bank' | 'credit' | 'support';
  title: string;
  message: string;
  amount?: number;
  date: Date;
  dueDate?: Date;
  actionable: boolean;
  actionLabel?: string;
  actionUrl?: string;
  actionData?: any;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedNotifications: Notification[] = (data || []).map(n => ({
        id: n.id,
        type: (n.notification_type || 'info') as Notification['type'],
        category: n.category as 'payment' | 'income' | 'cash-flow' | 'amazon' | 'bank' | 'credit' | 'support',
        title: n.title,
        message: n.message,
        amount: n.amount ? Number(n.amount) : undefined,
        date: new Date(n.sent_at),
        dueDate: n.due_date ? new Date(n.due_date) : undefined,
        actionable: n.actionable,
        actionLabel: n.action_label || undefined,
        actionUrl: n.action_url || undefined,
        read: n.read,
        priority: n.priority as 'high' | 'medium' | 'low',
      }));

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_history',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    loading,
    refetch: fetchNotifications,
  };
};
