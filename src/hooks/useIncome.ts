import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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
  createdAt: Date;
  updatedAt: Date;
}

export const useIncome = () => {
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch income items from database
  const fetchIncome = async () => {
    if (!user) {
      setIncomeItems([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching income:', error);
        toast.error('Failed to load income data');
        return;
      }

      const formattedData = data.map(item => ({
        id: item.id,
        description: item.description,
        amount: Number(item.amount),
        paymentDate: new Date(item.payment_date),
        source: item.source,
        status: item.status as 'received' | 'pending' | 'overdue',
        category: item.category || '',
        isRecurring: item.is_recurring,
        recurringFrequency: item.recurring_frequency as any,
        notes: item.notes || undefined,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      setIncomeItems(formattedData);
    } catch (error) {
      console.error('Error fetching income:', error);
      toast.error('Failed to load income data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new income item
  const addIncome = async (incomeData: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Authentication required');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('income')
        .insert({
          user_id: user.id,
          description: incomeData.description,
          amount: incomeData.amount,
          payment_date: incomeData.paymentDate.toISOString().split('T')[0],
          source: incomeData.source,
          status: incomeData.status,
          category: incomeData.category,
          is_recurring: incomeData.isRecurring,
          recurring_frequency: incomeData.recurringFrequency,
          notes: incomeData.notes
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding income:', error);
        toast.error('Failed to add income');
        return null;
      }

      const newItem: IncomeItem = {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        paymentDate: new Date(data.payment_date),
        source: data.source,
        status: data.status as 'received' | 'pending' | 'overdue',
        category: data.category || '',
        isRecurring: data.is_recurring,
        recurringFrequency: data.recurring_frequency as any,
        notes: data.notes || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setIncomeItems(prev => [newItem, ...prev]);
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
      if (updates.paymentDate !== undefined) updateData.payment_date = updates.paymentDate.toISOString().split('T')[0];
      if (updates.source !== undefined) updateData.source = updates.source;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
      if (updates.recurringFrequency !== undefined) updateData.recurring_frequency = updates.recurringFrequency;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

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

      const updatedItem: IncomeItem = {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        paymentDate: new Date(data.payment_date),
        source: data.source,
        status: data.status as 'received' | 'pending' | 'overdue',
        category: data.category || '',
        isRecurring: data.is_recurring,
        recurringFrequency: data.recurring_frequency as any,
        notes: data.notes || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setIncomeItems(prev => prev.map(item => item.id === id ? updatedItem : item));
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
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting income:', error);
        toast.error('Failed to delete income');
        return false;
      }

      setIncomeItems(prev => prev.filter(item => item.id !== id));
      toast.success('Income deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income');
      return false;
    }
  };

  // Refresh income data
  const refetch = () => {
    fetchIncome();
  };

  // Load income on mount and when auth changes
  useEffect(() => {
    fetchIncome();
  }, [user]);

  return {
    incomeItems,
    isLoading,
    addIncome,
    updateIncome,
    deleteIncome,
    refetch
  };
};