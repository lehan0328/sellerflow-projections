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
      
      setReserveAmount(reserve);
      setCanUpdate(true);
      
      console.log('[Reserve] 🔴🔴🔴 Loaded reserve amount:', reserve);
    } catch (error) {
      console.error('[Reserve] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReserveAmount = async (newAmount: number): Promise<void> => {
    try {
      console.log('[Reserve] 🔵 Starting update to:', newAmount);

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

      // First, get existing settings to preserve other fields
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[Reserve] Existing settings:', existingSettings);

      // Use upsert with all fields to avoid constraint violations
      console.log('[Reserve] 🟢 Upserting settings with reserve:', newAmount);
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          account_id: profile.account_id,
          safe_spending_reserve: Number(newAmount),
          // Preserve existing fields to avoid constraint violations
          forecast_confidence_threshold: existingSettings?.forecast_confidence_threshold ?? 5,
          forecasts_enabled: existingSettings?.forecasts_enabled ?? true,
          safe_spending_percentage: existingSettings?.safe_spending_percentage ?? 20,
          // Preserve chart settings
          chart_show_cashflow_line: existingSettings?.chart_show_cashflow_line ?? true,
          chart_show_resources_line: existingSettings?.chart_show_resources_line ?? true,
          chart_show_credit_line: existingSettings?.chart_show_credit_line ?? true,
          chart_show_reserve_line: existingSettings?.chart_show_reserve_line ?? true,
          chart_show_forecast_line: existingSettings?.chart_show_forecast_line ?? false,
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('[Reserve] Upsert result:', upsertData, 'Error:', upsertError);

      if (upsertError) {
        console.error('[Reserve] ❌ Upsert error:', upsertError);
        throw new Error(`Failed to save reserve: ${upsertError.message}`);
      }

      // Verify the update was successful
      console.log('[Reserve] 🔍 Verifying saved value...');
      const { data: verified, error: verifyError } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[Reserve] ✅ Verified value in DB:', verified?.safe_spending_reserve, 'Error:', verifyError);

      if (verifyError || !verified) {
        throw new Error('Failed to verify reserve was saved');
      }

      const savedValue = Number(verified.safe_spending_reserve);
      if (savedValue !== newAmount) {
        console.error('[Reserve] ⚠️ Saved value mismatch! Expected:', newAmount, 'Got:', savedValue);
        throw new Error(`Reserve mismatch: saved ${savedValue} instead of ${newAmount}`);
      }

      // Update local state ONLY after verifying database update
      console.log('[Reserve] 🎉 Update successful! Setting local state to:', newAmount);
      setReserveAmount(newAmount);

      toast({
        title: "Reserve amount updated",
        description: `Reserve set to $${newAmount.toLocaleString()}. The calendar and safe spending calculations will update automatically.`,
      });

      console.log('[Reserve] ✨ Reserve update complete');
    } catch (error: any) {
      console.error('[Reserve] ❌ Update failed:', error);
      toast({
        title: "Error updating reserve",
        description: error.message || "Please try again",
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
