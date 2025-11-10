import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  paymentDate: Date;
  source: string;
  status: 'received' | 'pending' | 'overdue';
  category: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly' | 'weekdays';
  notes?: string;
  customerId?: string;
  customer?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useIncome = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Helper function to format date for database without timezone issues
  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse 'YYYY-MM-DD' into a local Date (avoids timezone shift)
  const parseDateFromDB = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Fetch income items from database
  const fetchIncome = useCallback(async (): Promise<IncomeItem[]> => {
    if (!user) return [];

    // Get user's account_id for proper filtering
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      console.error('[Income] No account_id found');
      return [];
    }

    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('account_id', profile.account_id)
      .eq('archived', false)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching income:', error);
      toast.error('Failed to load income data');
      return [];
    }

    const formattedData = data.map(item => ({
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      paymentDate: parseDateFromDB(item.payment_date),
      source: item.source,
      status: item.status as 'received' | 'pending' | 'overdue',
      category: item.category || '',
      isRecurring: item.is_recurring,
      recurringFrequency: item.recurring_frequency as any,
      notes: item.notes || undefined,
      customerId: item.customer_id || undefined,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));

    // Deduplicate by ID
    const uniqueItems = formattedData.filter((item, index, self) => 
      index === self.findIndex(i => i.id === item.id)
    );

    console.log('[Income] Account:', profile.account_id, 'Fetched:', data.length, 'Unique:', uniqueItems.length);
    return uniqueItems;
  }, [user]);

  // Use React Query with 15-minute staleTime
  const { data: incomeItems = [], isLoading, refetch } = useQuery({
    queryKey: ['income', user?.id],
    queryFn: fetchIncome,
    enabled: !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Add new income item
  const addIncome = async (incomeData: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Authentication required');
      return null;
    }

    try {
      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        toast.error('Account not found');
        return null;
      }

      const { data, error } = await supabase
        .from('income')
        .insert({
          user_id: user.id,
          account_id: profile.account_id,
          description: incomeData.description,
          amount: incomeData.amount,
          payment_date: formatDateForDB(incomeData.paymentDate),
          source: incomeData.source,
          status: incomeData.status,
          category: incomeData.category,
          is_recurring: incomeData.isRecurring,
          recurring_frequency: incomeData.recurringFrequency,
          notes: incomeData.notes,
          customer_id: incomeData.customerId || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding income:', error);
        toast.error('Failed to add income');
        return null;
      }

      console.log('[Income] Added income to account:', profile.account_id);

      const newItem: IncomeItem = {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        paymentDate: parseDateFromDB(data.payment_date),
        source: data.source,
        status: data.status as 'received' | 'pending' | 'overdue',
        category: data.category || '',
        isRecurring: data.is_recurring,
        recurringFrequency: data.recurring_frequency as any,
        notes: data.notes || undefined,
        customerId: data.customer_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      await queryClient.invalidateQueries({ queryKey: ['income', user.id] });
      toast.success('Income added successfully');
      return newItem;
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income');
      return null;
    }
  };

  // Update income item
  const updateIncome = async (id: string, updates: Partial<Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!user) {
      toast.error('Authentication required');
      return false;
    }

    try {
      const updateData: any = {};
      
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.paymentDate !== undefined) updateData.payment_date = formatDateForDB(updates.paymentDate);
      if (updates.source !== undefined) updateData.source = updates.source;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        // Automatically archive only when status is 'received' AND payment date is in the past (overdue)
        if (updates.status === 'received') {
          const income = incomeItems.find(item => item.id === id);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (income && income.paymentDate < today) {
            updateData.archived = true;
          }
        }
      }
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
      if (updates.recurringFrequency !== undefined) updateData.recurring_frequency = updates.recurringFrequency;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.customerId !== undefined) updateData.customer_id = updates.customerId;

      const { data, error } = await supabase
        .from('income')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating income:', error);
        toast.error('Failed to update income');
        return false;
      }

      // If archived, invalidate query
      if (data.archived) {
        await queryClient.invalidateQueries({ queryKey: ['income', user.id] });
        toast.success('Income marked as received and archived');
        return true;
      }

      const updatedItem: IncomeItem = {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        paymentDate: parseDateFromDB(data.payment_date),
        source: data.source,
        status: data.status as 'received' | 'pending' | 'overdue',
        category: data.category || '',
        isRecurring: data.is_recurring,
        recurringFrequency: data.recurring_frequency as any,
        notes: data.notes || undefined,
        customerId: data.customer_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      await queryClient.invalidateQueries({ queryKey: ['income', user.id] });
      toast.success('Income updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error('Failed to update income');
      return false;
    }
  };

  // Delete income item
  const deleteIncome = async (id: string) => {
    if (!user) {
      toast.error('Authentication required');
      return false;
    }

    try {
      // Get the income details before deleting
      const income = incomeItems.find(item => item.id === id);
      if (!income) throw new Error('Income not found');

      // Save to deleted_transactions before deleting
      const { error: saveError } = await supabase
        .from('deleted_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'income',
          original_id: income.id,
          name: income.description,
          amount: income.amount,
          description: income.description,
          payment_date: formatDateForDB(income.paymentDate),
          status: income.status,
          category: income.category,
          metadata: {
            source: income.source,
            isRecurring: income.isRecurring,
            recurringFrequency: income.recurringFrequency,
            notes: income.notes,
            customerId: income.customerId
          }
        });

      if (saveError) {
        console.error('Error saving deleted income:', saveError);
      }

      // Delete from income table
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting income:', error);
        toast.error('Failed to delete income');
        return false;
      }

      // Also delete any related sales_order transactions with matching amount and date
      const { error: txDeleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('type', 'sales_order')
        .eq('amount', income.amount)
        .eq('transaction_date', formatDateForDB(income.paymentDate));

      if (txDeleteError) {
        console.error('Error deleting related sales_order transactions:', txDeleteError);
        // Don't fail the whole operation, just log
      }

      await queryClient.invalidateQueries({ queryKey: ['income', user.id] });
      toast.success('Income deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income');
      return false;
    }
  };

  // Set up debounced real-time updates
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const debouncedRefetch = () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        // Wait 1.5 seconds before refetching
        debounceTimerRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: ['income', user.id],
            exact: true 
          });
        }, 1500);
      };

      channel = supabase
        .channel('income-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'income',
        }, debouncedRefetch)
        .subscribe();
    };
    setup();
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channel) {
        console.log('[Income] Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return {
    incomeItems,
    isLoading,
    addIncome,
    updateIncome,
    deleteIncome,
    refetch
  };
};