import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SafeSpendingData {
  safe_daily_limit: number;
  total_180day_limit: number;
  confidence_level: "high" | "medium" | "low";
  reasoning: string;
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

  const fetchSafeSpending = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      const { data: result, error: invokeError } = await supabase.functions.invoke(
        "calculate-safe-spending",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (invokeError) throw invokeError;
      setData(result);
    } catch (err) {
      console.error("Error fetching safe spending:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate safe spending");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSafeSpending();
  }, []);

  return { data, isLoading, error, refetch: fetchSafeSpending };
};
