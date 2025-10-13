import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useReserveAmount = () => {
  const [reserveAmount, setReserveAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [canUpdate, setCanUpdate] = useState(true);
  const { toast } = useToast();

  const fetchReserveAmount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        console.error('[Reserve] No account_id found');
        setIsLoading(false);
        return;
      }

      // Get reserve amount from user_settings
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve, reserve_last_updated_at')
        .eq('account_id', profile.account_id)
        .maybeSingle();

      if (error) {
        console.error('[Reserve] Error fetching:', error);
        throw error;
      }

      const reserve = Number(settings?.safe_spending_reserve || 0);
      const lastUpdate = settings?.reserve_last_updated_at ? new Date(settings.reserve_last_updated_at) : null;
      
      setReserveAmount(reserve);
      setLastUpdated(lastUpdate);
      
      // Check if 24 hours have passed
      if (lastUpdate) {
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        setCanUpdate(hoursSinceUpdate >= 24);
      } else {
        setCanUpdate(true);
      }
      
      console.log('[Reserve] Loaded:', reserve, 'Last updated:', lastUpdate);
    } catch (error) {
      console.error('[Reserve] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReserveAmount = async (newAmount: number): Promise<void> => {
    try {
      // Check 24-hour restriction
      if (!canUpdate && lastUpdated) {
        const hoursRemaining = 24 - ((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60));
        toast({
          title: "Update restricted",
          description: `Reserve can only be changed once every 24 hours. Try again in ${Math.ceil(hoursRemaining)} hours.`,
          variant: "destructive",
        });
        return;
      }

      console.log('[Reserve] Updating to:', newAmount);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error("Account not found");
      }

      console.log('[Reserve] Using account_id:', profile.account_id);

      // Check if settings exist
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('account_id', profile.account_id)
        .maybeSingle();

      if (!existing) {
        // Create new settings record
        console.log('[Reserve] Creating new settings record');
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            account_id: profile.account_id,
            safe_spending_reserve: newAmount,
            reserve_last_updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[Reserve] Insert error:', insertError);
          throw insertError;
        }
      } else {
        // Update existing record
        console.log('[Reserve] Updating existing record');
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({ 
            safe_spending_reserve: newAmount,
            reserve_last_updated_at: new Date().toISOString()
          })
          .eq('account_id', profile.account_id);

        if (updateError) {
          console.error('[Reserve] Update error:', updateError);
          throw updateError;
        }
      }

      // Verify the update
      const { data: verified } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve')
        .eq('account_id', profile.account_id)
        .maybeSingle();

      console.log('[Reserve] Verified value:', verified?.safe_spending_reserve);

      // Update local state
      setReserveAmount(newAmount);
      setLastUpdated(new Date());
      setCanUpdate(false);

      toast({
        title: "Reserve amount updated",
        description: `Reserve set to $${newAmount.toLocaleString()}. Can be changed again in 24 hours.`,
      });
    } catch (error) {
      console.error('[Reserve] Update failed:', error);
      toast({
        title: "Error updating reserve",
        description: "Please try again",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchReserveAmount();

    // Subscribe to changes
    const channel = supabase
      .channel('reserve-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_settings' 
      }, () => {
        console.log('[Reserve] Settings changed, refetching');
        fetchReserveAmount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    reserveAmount,
    isLoading,
    updateReserveAmount,
    refetch: fetchReserveAmount,
    canUpdate,
    lastUpdated
  };
};
