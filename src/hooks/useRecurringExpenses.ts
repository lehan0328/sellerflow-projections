import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  transaction_name: string | null;
  amount: number;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'weekdays';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  type: 'income' | 'expense';
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useRecurringExpenses = () => {
  const queryClient = useQueryClient();

  const { data: recurringExpenses = [], isLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RecurringExpense[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (expense: Omit<RecurringExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert([{ ...expense, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast({ title: "Recurring expense added successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add recurring expense", 
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

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast({ title: "Recurring expense updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update recurring expense", 
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
      toast({ title: "Recurring expense deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete recurring expense", 
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
