import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RecurringExpense {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  transaction_name: string | null;
  amount: number;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | '2-months' | '3-months' | 'weekdays';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  type: 'income' | 'expense';
  category: string | null;
  notes: string | null;
  credit_card_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useRecurringExpenses = () => {
  const queryClient = useQueryClient();

  const { data: recurringExpenses = [], isLoading, error: queryError } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: async () => {
      console.log('[useRecurringExpenses] Fetching recurring expenses...');
      
      // Get current user's account_id for debugging
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useRecurringExpenses] No authenticated user found');
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      console.log('[useRecurringExpenses] Current user profile:', {
        user_id: user.id,
        account_id: profile?.account_id
      });

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useRecurringExpenses] Query error:', error);
        throw error;
      }

      console.log('[useRecurringExpenses] Query result:', {
        count: data?.length || 0,
        sample: data?.[0] ? {
          id: data[0].id,
          name: data[0].name,
          account_id: data[0].account_id
        } : null
      });

      if (!data || data.length === 0) {
        console.warn('[useRecurringExpenses] No recurring expenses returned by query - this may indicate RLS filtering');
      }

      return data as RecurringExpense[];
    },
    staleTime: 3 * 60 * 60 * 1000, // 3 hours
    gcTime: 6 * 60 * 60 * 1000, // 6 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Log query errors
  useEffect(() => {
    if (queryError) {
      console.error('[useRecurringExpenses] Query failed:', queryError);
      toast({
        title: "Failed to load recurring expenses",
        description: queryError instanceof Error ? queryError.message : "Please try refreshing the page",
        variant: "destructive"
      });
    }
  }, [queryError]);

  const createMutation = useMutation({
    mutationFn: async (expense: Omit<RecurringExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert([{ ...expense, user_id: user.id }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A recurring expense with this name already exists');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      const typeLabel = data.type === 'income' ? 'income' : 'expense';
      toast({ title: `Recurring ${typeLabel} added successfully` });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add recurring transaction", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A recurring expense with this name already exists');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      const typeLabel = data.type === 'income' ? 'income' : 'expense';
      toast({ title: `Recurring ${typeLabel} updated successfully` });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update recurring transaction", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast({ title: "Recurring transaction deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete recurring transaction", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return {
    recurringExpenses,
    isLoading,
    createRecurringExpense: createMutation.mutate,
    updateRecurringExpense: updateMutation.mutate,
    deleteRecurringExpense: deleteMutation.mutate,
  };
};
