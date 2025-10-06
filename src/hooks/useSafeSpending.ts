import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SafeSpendingData {
  safe_daily_limit: number;
  total_180day_limit: number;
  percentage: number;
  projection_data: {
    current_balance: number;
    projected_income: number;
    projected_expenses: number;
    projected_balance: number;
  };
}

export const useSafeSpending = () => {
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(20);

  const fetchSafeSpending = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // Get user settings to fetch the percentage
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('safe_spending_percentage, total_cash')
        .eq('user_id', session.user.id)
        .single();

      if (settingsError) throw settingsError;

      const userPercentage = settings?.safe_spending_percentage || 20;
      setPercentage(userPercentage);

      // Get current balance
      const currentBalance = Number(settings?.total_cash || 0);

      // Calculate based on percentage of current balance
      const total180DayLimit = currentBalance * (userPercentage / 100);
      const dailyLimit = total180DayLimit / 180;

      setData({
        safe_daily_limit: dailyLimit,
        total_180day_limit: total180DayLimit,
        percentage: userPercentage,
        projection_data: {
          current_balance: currentBalance,
          projected_income: 0,
          projected_expenses: 0,
          projected_balance: currentBalance,
        }
      });
    } catch (err) {
      console.error("Error calculating safe spending:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate safe spending");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePercentage = async (newPercentage: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ safe_spending_percentage: newPercentage })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      await fetchSafeSpending();
    } catch (err) {
      console.error("Error updating percentage:", err);
    }
  };

  useEffect(() => {
    fetchSafeSpending();
  }, []);

  return { data, isLoading, error, percentage, updatePercentage, refetch: fetchSafeSpending };
};
