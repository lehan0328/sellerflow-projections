import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { startOfDay } from 'date-fns';

export interface CreditCardPayment {
  id: string;
  user_id: string;
  account_id: string;
  credit_card_id: string;
  bank_account_id: string;
  amount: number;
  payment_date: string;
  description: string | null;
  payment_type: 'manual' | 'bill_payment';
  status: 'scheduled' | 'completed';
  created_at: string;
  updated_at: string;
}

export const useCreditCardPayments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['credit-card-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) return [];

      const { data, error } = await supabase
        .from('credit_card_payments')
        .select('*')
        .eq('account_id', profile.account_id)
        .order('payment_date', { ascending: true });

      if (error) throw error;
      
      return data as CreditCardPayment[];
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
  });

  // Auto-archive overdue payments
  useEffect(() => {
    const archiveOverduePayments = async () => {
      if (!payments.length) return;
      
      const today = startOfDay(new Date());
      const paymentsToArchive = payments.filter(p => {
        const paymentDate = startOfDay(new Date(p.payment_date));
        return paymentDate < today && p.status === 'scheduled';
      });
      
      if (paymentsToArchive.length > 0) {
        await Promise.all(
          paymentsToArchive.map(p =>
            supabase
              .from('credit_card_payments')
              .update({ status: 'completed' })
              .eq('id', p.id)
          )
        );
        queryClient.invalidateQueries({ queryKey: ['credit-card-payments', user?.id] });
      }
    };
    
    archiveOverduePayments();
  }, [payments, user?.id, queryClient]);

  // Real-time subscription for credit card payments
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('credit_card_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_payments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['credit-card-payments', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    payments,
    isLoading,
    error,
    refetch,
  };
};
