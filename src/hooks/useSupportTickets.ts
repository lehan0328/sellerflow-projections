import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  user_email?: string;
  user_company?: string;
  user_role?: string;
}

export const useSupportTickets = (adminView = false) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, [adminView]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      
      // Fetch tickets with user profile and role information
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch user emails from auth.users via admin API
      const { data: authData, error: usersError } = await supabase.auth.admin.listUsers();
      const users = authData?.users || [];
      
      // Fetch profiles for company info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, company');
      
      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Map user data
      const userEmailMap = new Map<string, string>();
      users.forEach((u: any) => {
        if (u.id && u.email) userEmailMap.set(u.id, u.email);
      });
      
      const userCompanyMap = new Map<string, string>();
      profiles?.forEach((p: any) => {
        if (p.user_id && p.company) userCompanyMap.set(p.user_id, p.company);
      });
      
      const userRoleMap = new Map<string, string>();
      userRoles?.forEach((r: any) => {
        if (r.user_id && r.role) userRoleMap.set(r.user_id, r.role);
      });

      // Enrich tickets with user info
      const enrichedTickets = (ticketsData || []).map(ticket => ({
        ...ticket,
        user_email: userEmailMap.get(ticket.user_id),
        user_company: userCompanyMap.get(ticket.user_id),
        user_role: userRoleMap.get(ticket.user_id)
      }));

      setTickets(enrichedTickets as SupportTicket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async (ticketData: {
    subject: string;
    message: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: session.user.id,
          ...ticketData,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });

      await fetchTickets();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create support ticket",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateTicket = async (
    ticketId: string,
    updates: Partial<SupportTicket>
  ) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });

      await fetchTickets();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });

      await fetchTickets();
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete ticket",
        variant: "destructive",
      });
    }
  };

  return {
    tickets,
    isLoading,
    createTicket,
    updateTicket,
    deleteTicket,
    refetch: fetchTickets,
  };
};
