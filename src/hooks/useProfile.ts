import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  user_id: string;
  account_id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  currency: string | null;
  max_team_members: number | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - profiles rarely change
  });
};
