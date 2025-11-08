import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CashFlowEvent {
  id: string;
  user_id: string;
  account_id: string | null;
  type: string;
  amount: number;
  event_date: string;
  description: string | null;
  vendor_id: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useCashFlowEvents = () => {
  const { session } = useAuth();

  const { data: cashFlowEvents = [], isLoading, error } = useQuery({
    queryKey: ['cash-flow-events', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('cash_flow_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as CashFlowEvent[];
    },
    enabled: !!session?.user?.id,
  });

  return {
    cashFlowEvents,
    isLoading,
    error: error?.message,
  };
};
