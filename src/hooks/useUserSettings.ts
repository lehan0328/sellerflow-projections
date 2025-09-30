import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserSettings = () => {
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no settings exist, create default settings
        if (error.code === 'PGRST116') {
          await createDefaultSettings(user.id);
          return;
        }
        throw error;
      }

      setTotalCash(Number(data.total_cash));
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast({
        title: "Error",
        description: "Failed to load user settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          total_cash: 0
        });

      if (error) throw error;
      setTotalCash(0);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateTotalCash = async (amountToAdd: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate new total by adding to current amount
      const newTotal = totalCash + amountToAdd;

      const { error } = await supabase
        .from('user_settings')
        .update({ total_cash: newTotal })
        .eq('user_id', user.id);

      if (error) throw error;

      setTotalCash(newTotal);
      console.info('Cash updated in database:', newTotal, '(added:', amountToAdd, ')');
    } catch (error) {
      console.error('Error updating total cash:', error);
      toast({
        title: "Error",
        description: "Failed to update cash amount",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const setStartingBalance = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ total_cash: amount })
        .eq('user_id', user.id);

      if (error) throw error;

      setTotalCash(amount);
      
      toast({
        title: "Success",
        description: `Starting balance set to $${amount.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Error setting starting balance:', error);
      toast({
        title: "Error",
        description: "Failed to set starting balance",
        variant: "destructive",
      });
    }
  };

  const resetAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Reset user settings
      await supabase
        .from('user_settings')
        .update({ total_cash: 0 })
        .eq('user_id', user.id);

      // Delete all transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      // Delete all vendors
      await supabase
        .from('vendors')
        .delete()
        .eq('user_id', user.id);

      setTotalCash(0);
      
      toast({
        title: "Success",
        description: "Account data has been reset",
      });

      // Refresh the page to show clean state
      window.location.reload();
    } catch (error) {
      console.error('Error resetting account:', error);
      toast({
        title: "Error",
        description: "Failed to reset account data",
        variant: "destructive",
      });
    }
  };

  return {
    totalCash,
    loading,
    updateTotalCash,
    setStartingBalance,
    resetAccount,
    refetch: fetchUserSettings
  };
};