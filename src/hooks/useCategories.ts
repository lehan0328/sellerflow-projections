import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  is_default: boolean;
  is_recurring?: boolean;
}

export function useCategories(type: 'expense' | 'income', isRecurring?: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's account_id to filter categories properly
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        console.error('[Categories] No account_id found for user');
        return;
      }

      let query = supabase
        .from('categories')
        .select('*')
        .eq('type', type)
        .eq('account_id', profile.account_id);

      // Filter by is_recurring if specified
      if (isRecurring !== undefined) {
        query = query.eq('is_recurring', isRecurring);
      }

      const { data, error } = await query
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      
      // Deduplicate by NAME (case-insensitive) for the same account
      let uniqueCategories = (data || []).reduce((acc, category) => {
        const normalizedName = category.name.toLowerCase().trim();
        if (!acc.find(c => c.name.toLowerCase().trim() === normalizedName)) {
          acc.push(category as Category);
        }
        return acc;
      }, [] as Category[]);
      
      // Filter out default categories for recurring transactions
      if (isRecurring === true) {
        uniqueCategories = uniqueCategories.filter(cat => !cat.is_default);
      }
      
      console.log('[Categories] Type:', type, 'Account:', profile.account_id, 'Fetched:', uniqueCategories.length);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      // Trim and normalize the name
      const normalizedName = name.trim();
      
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
          name: normalizedName,
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
        description: `Category "${normalizedName}" added successfully`,
      });

      // Optimistically add to local state so UIs reflect it immediately
      setCategories((prev) => {
        const norm = normalizedName.toLowerCase().trim();
        if (prev.some((c) => c.name.toLowerCase().trim() === norm)) return prev;
        const next = [...prev, data as Category];
        // Keep default categories surfaced and sort alphabetically
        next.sort((a, b) => (Number(b.is_default) - Number(a.is_default)) || a.name.localeCompare(b.name));
        return next;
      });

      // Background refresh to stay in sync with server and realtime
      fetchCategories();
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

      await fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('[Categories] Setting up subscription for type:', type, 'isRecurring:', isRecurring);
    fetchCategories();

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
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      console.log('[Categories] Cleaning up subscription for type:', type);
      supabase.removeChannel(channel);
    };
  }, [type, isRecurring]);

  return {
    categories,
    isLoading,
    addCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
}
