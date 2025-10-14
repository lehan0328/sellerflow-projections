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
        .eq('user_id', user.id)
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
      
      console.log('[Reserve] 🔴🔴🔴 Loaded reserve amount:', reserve, 'Last updated:', lastUpdate);
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
        throw new Error("24-hour restriction active");
      }

      console.log('[Reserve] Starting update to:', newAmount);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[Reserve] User:', user?.id, 'Error:', userError);
      if (!user) throw new Error("Not authenticated");

      // Get user's account_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[Reserve] Profile:', profile, 'Error:', profileError);
      
      if (profileError) {
        throw new Error(`Profile fetch error: ${profileError.message}`);
      }

      if (!profile?.account_id) {
        throw new Error("Account not found");
      }

      console.log('[Reserve] Using account_id:', profile.account_id);

      // Use upsert to handle both create and update cases
      console.log('[Reserve] Upserting settings record');
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          account_id: profile.account_id,
          safe_spending_reserve: newAmount,
          reserve_last_updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('[Reserve] Upsert result:', upsertData, 'Error:', upsertError);

      if (upsertError) {
        console.error('[Reserve] Upsert error:', upsertError);
        throw new Error(`Upsert error: ${upsertError.message}`);
      }

      // Verify the update
      const { data: verified } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve')
        .eq('user_id', user.id)
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

    // Subscribe to changes for current user only - but only refetch if reserve amount actually changed
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('reserve-changes')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`
        }, (payload: any) => {
          // Only refetch if safe_spending_reserve actually changed
          const oldReserve = payload.old?.safe_spending_reserve;
          const newReserve = payload.new?.safe_spending_reserve;
          
          if (oldReserve !== newReserve) {
            console.log('[Reserve] Reserve amount changed, refetching');
            fetchReserveAmount();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();

    return () => {
      cleanup.then(fn => fn?.());
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
