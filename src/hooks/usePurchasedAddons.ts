import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePurchasedAddons = () => {
  const { data: addons, isLoading, refetch } = useQuery({
    queryKey: ['purchased-addons'],
    staleTime: 10 * 60 * 1000, // 10 minutes - addon purchases don't change frequently
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { bank_connections: 0, amazon_connections: 0, team_members: 0 };

      const { data, error } = await supabase
        .from('purchased_addons')
        .select('addon_type, quantity')
        .eq('user_id', user.id);

      if (error) throw error;

      // Sum up quantities by type
      const totals = data.reduce((acc, addon) => {
        if (addon.addon_type === 'bank_connection') {
          acc.bank_connections += addon.quantity;
        } else if (addon.addon_type === 'amazon_connection') {
          acc.amazon_connections += addon.quantity;
        } else if (addon.addon_type === 'user') {
          acc.team_members += addon.quantity;
        }
        return acc;
      }, { bank_connections: 0, amazon_connections: 0, team_members: 0 });

      return totals;
    },
  });

  return {
    purchasedAddons: addons || { bank_connections: 0, amazon_connections: 0, team_members: 0 },
    isLoading,
    refetch,
  };
};