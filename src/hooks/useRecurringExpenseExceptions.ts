import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RecurringExpenseException {
  id: string;
  user_id: string;
  account_id: string | null;
  recurring_expense_id: string;
  exception_date: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useRecurringExpenseExceptions = (recurringExpenseId?: string) => {
  const queryClient = useQueryClient();

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ['recurring-expense-exceptions', recurringExpenseId],
    queryFn: async () => {
      if (!recurringExpenseId) return [];

      const { data, error } = await supabase
        .from('recurring_expense_exceptions')
        .select('*')
        .eq('recurring_expense_id', recurringExpenseId)
        .order('exception_date', { ascending: true });

      if (error) throw error;
      return data as RecurringExpenseException[];
    },
    enabled: !!recurringExpenseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createException = useMutation({
    mutationFn: async ({ 
      recurringExpenseId, 
      exceptionDate, 
      reason 
    }: { 
      recurringExpenseId: string; 
      exceptionDate: string; 
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the recurring expense to get the account_id
      const { data: recurringExpense } = await supabase
        .from('recurring_expenses')
        .select('account_id')
        .eq('id', recurringExpenseId)
        .single();

      const { data, error } = await supabase
        .from('recurring_expense_exceptions')
        .insert([{
          user_id: user.id,
          account_id: recurringExpense?.account_id || null,
          recurring_expense_id: recurringExpenseId,
          exception_date: exceptionDate,
          reason: reason || null,
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This date is already skipped');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expense-exceptions'] });
      toast({ title: "Date skipped successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to skip date", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteException = useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await supabase
        .from('recurring_expense_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expense-exceptions'] });
      toast({ title: "Date restored successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to restore date", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return {
    exceptions,
    isLoading,
    createException: createException.mutate,
    deleteException: deleteException.mutate,
  };
};
