import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  is_default: boolean;
  is_recurring?: boolean;
}

export function useCategories(type: 'expense' | 'income', isRecurring?: boolean) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const fetchCategories = async (): Promise<Category[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user's account_id to filter categories properly
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      console.error('[Categories] No account_id found for user');
      return [];
    }

    let query = supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .eq('account_id', profile.account_id);

    const recurringFilter = isRecurring === true ? true : false;
    query = query.eq('is_recurring', recurringFilter);

    const { data, error } = await query
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
      return [];
    }
    
    // Deduplicate by NAME (case-insensitive) for the same account
    const uniqueCategories = (data || []).reduce((acc, category) => {
      const normalizedName = category.name.toLowerCase().trim();
      if (!acc.find(c => c.name.toLowerCase().trim() === normalizedName)) {
        acc.push(category as Category);
      }
      return acc;
    }, [] as Category[]);
    
    console.log('[Categories] Type:', type, 'Recurring:', recurringFilter, 'Account:', profile.account_id, 'Fetched:', uniqueCategories.length);
    return uniqueCategories;
  };

  // Use React Query with 60-minute staleTime (categories rarely change)
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['categories', type, isRecurring],
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });

  const addCategory = async (name: string, recurring = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      console.log('[Category] Adding new category:', { 
        name, 
        type, 
        userId: user.id, 
        accountId: profile?.account_id 
      });

      // Trim, capitalize first letter, lowercase rest
      const normalizedName = name.trim();
      const capitalizedName = normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1).toLowerCase();
      
      // Check if category already exists (case-insensitive)
      const { data: existing } = await supabase
        .from('categories')
        .select('id, name')
        .eq('account_id', profile?.account_id)
        .eq('type', type)
        .ilike('name', normalizedName);

      if (existing && existing.length > 0) {
        console.log('[Category] Category already exists:', existing[0]);
        toast({
          title: "Category already exists",
          description: `"${normalizedName}" is already in your ${type} categories`,
          variant: "destructive",
        });
        return existing[0];
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          account_id: profile?.account_id,
          name: capitalizedName,
          type,
          is_default: false,
          is_recurring: recurring,
        })
        .select()
        .single();

      if (error) {
        console.error('[Category] Error adding category:', error);
        
        // Handle duplicate key error with friendly message
        if (error.code === '23505') {
          toast({
            title: "Category already exists",
            description: `"${normalizedName}" is already in your ${type} categories`,
            variant: "destructive",
          });
          return null;
        }
        
        throw error;
      }

      console.log('[Category] Successfully added category:', data);

      toast({
        title: "Success",
        description: `Category "${capitalizedName}" added successfully`,
      });

      // Invalidate query
      await queryClient.invalidateQueries({ queryKey: ['categories', type, isRecurring] });
      return data;
    } catch (error: any) {
      console.error('[Category] Failed to add category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });

      await queryClient.invalidateQueries({ queryKey: ['categories', type, isRecurring] });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  // Set up debounced real-time updates
  useEffect(() => {
    console.log('[Categories] Setting up subscription for type:', type, 'isRecurring:', isRecurring);

    const debouncedRefetch = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Wait 3 seconds before refetching (categories rarely change)
      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['categories', type, isRecurring],
          exact: true 
        });
      }, 3000);
    };

    const channel = supabase
      .channel(`categories_changes_${type}_${isRecurring}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `type=eq.${type}`,
        },
        (payload) => {
          console.log('[Categories] Realtime update received:', { type, event: payload.eventType });
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      console.log('[Categories] Cleaning up subscription for type:', type);
      supabase.removeChannel(channel);
    };
  }, [type, isRecurring, queryClient]);

  return {
    categories,
    isLoading,
    addCategory,
    deleteCategory,
    refetch,
  };
}
