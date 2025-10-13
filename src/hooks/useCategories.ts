import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  is_default: boolean;
}

export function useCategories(type: 'expense' | 'income') {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', type)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setCategories((data || []) as Category[]);
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

  const addCategory = async (name: string) => {
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

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          account_id: profile?.account_id,
          name,
          type,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Category] Error adding category:', error);
        throw error;
      }

      console.log('[Category] Successfully added category:', data);

      toast({
        title: "Success",
        description: `Category "${name}" added successfully`,
      });

      await fetchCategories();
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
    fetchCategories();

    const channel = supabase
      .channel('categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `type=eq.${type}`,
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  return {
    categories,
    isLoading,
    addCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
}
