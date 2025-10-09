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

      // Delete all user data from all tables
      await Promise.all([
        // Financial accounts
        supabase.from('bank_accounts').delete().eq('user_id', user.id),
        supabase.from('bank_transactions').delete().eq('user_id', user.id),
        supabase.from('credit_cards').delete().eq('user_id', user.id),
        supabase.from('amazon_accounts').delete().eq('user_id', user.id),
        supabase.from('amazon_payouts').delete().eq('user_id', user.id),
        supabase.from('amazon_transactions').delete().eq('user_id', user.id),
        
        // Transactions and records
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('income').delete().eq('user_id', user.id),
        supabase.from('vendors').delete().eq('user_id', user.id),
        supabase.from('customers').delete().eq('user_id', user.id),
        supabase.from('recurring_expenses').delete().eq('user_id', user.id),
        
        // Planning and insights
        supabase.from('scenarios').delete().eq('user_id', user.id),
        supabase.from('cash_flow_events').delete().eq('user_id', user.id),
        supabase.from('cash_flow_insights').delete().eq('user_id', user.id),
        
        // Deleted records
        supabase.from('deleted_transactions').delete().eq('user_id', user.id),
        
        // Trial addons
        supabase.from('trial_addon_usage').delete().eq('user_id', user.id),
        
        // Support and team
        supabase.from('support_tickets').delete().eq('user_id', user.id),
        supabase.from('user_roles').delete().eq('user_id', user.id),
        
        // Referrals
        supabase.from('referrals').delete().eq('referrer_id', user.id),
        supabase.from('referrals').delete().eq('referred_user_id', user.id),
        supabase.from('referral_codes').delete().eq('user_id', user.id),
        supabase.from('referral_rewards').delete().eq('user_id', user.id),
        
        // Delete user settings
        supabase.from('user_settings').delete().eq('user_id', user.id),
      ]);

      // Create fresh default settings
      await supabase.from('user_settings').insert({
        user_id: user.id,
        total_cash: 0,
        safe_spending_percentage: 20,
        safe_spending_reserve: 0
      });

      setTotalCash(0);
      
      toast({
        title: "Success",
        description: "All account data has been completely reset",
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