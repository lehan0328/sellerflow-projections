import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Payee {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  category?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function usePayees() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchPayees = useCallback(async () => {
    if (!user) {
      setPayees([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user's account_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.account_id) {
        setPayees([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payees' as any)
        .select('*')
        .eq('account_id', profile.account_id)
        .order('name', { ascending: true }) as any;

      if (error) throw error;

      setPayees((data || []) as Payee[]);
    } catch (error) {
      console.error("Error fetching payees:", error);
      toast.error("Failed to load payees");
      setPayees([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addPayee = async (payeeData: {
    name: string;
    category?: string;
    payment_method?: string;
    notes?: string;
  }) => {
    if (!user) {
      toast.error("You must be logged in to add a payee");
      return;
    }

    try {
      // Get user's account_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.account_id) {
        toast.error("Account not found");
        return;
      }

      const { data, error } = await supabase
        .from('payees' as any)
        .insert([
          {
            user_id: user.id,
            account_id: profile.account_id,
            name: payeeData.name,
            category: payeeData.category || null,
            payment_method: payeeData.payment_method || null,
            notes: payeeData.notes || null,
          },
        ])
        .select()
        .single() as any;

      if (error) throw error;

      if (data) {
        setPayees((prev) => [...prev, data as Payee].sort((a, b) => a.name.localeCompare(b.name)));
        return data as Payee;
      }
    } catch (error) {
      console.error("Error adding payee:", error);
      toast.error("Failed to add payee");
      throw error;
    }
  };

  const updatePayee = async (id: string, updates: Partial<Omit<Payee, 'id' | 'user_id' | 'account_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('payees' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any;

      if (error) throw error;

      if (data) {
        setPayees((prev) =>
          prev.map((payee) => (payee.id === id ? data as Payee : payee)).sort((a, b) => a.name.localeCompare(b.name))
        );
        return data as Payee;
      }
    } catch (error) {
      console.error("Error updating payee:", error);
      toast.error("Failed to update payee");
      throw error;
    }
  };

  const deletePayee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payees' as any)
        .delete()
        .eq('id', id) as any;

      if (error) throw error;

      setPayees((prev) => prev.filter((payee) => payee.id !== id));
      toast.success("Payee deleted successfully");
    } catch (error) {
      console.error("Error deleting payee:", error);
      toast.error("Failed to delete payee");
      throw error;
    }
  };

  const refetch = useCallback(() => {
    fetchPayees();
  }, [fetchPayees]);

  useEffect(() => {
    fetchPayees();
  }, [fetchPayees]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('payees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payees',
        },
        () => {
          fetchPayees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPayees]);

  return {
    payees,
    isLoading,
    addPayee,
    updatePayee,
    deletePayee,
    refetch,
  };
}
