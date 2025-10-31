import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, addDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

interface AmazonRevenue {
  // Last 30 days metrics
  last30DaysNetPayouts: number;        // From amazon_payouts.total_amount (confirmed only)
  last30DaysGrossRevenue: number;      // From amazon_transactions.amount (orders only)
  
  // Current month metrics
  currentMonthNetPayouts: number;      // From amazon_payouts.total_amount (confirmed only)
  currentMonthGrossRevenue: number;    // From amazon_transactions.amount (orders only)
  
  // Previous month metrics (for comparison)
  previousMonthNetPayouts: number;     // From amazon_payouts.total_amount (confirmed only)
  previousMonthGrossRevenue: number;   // From amazon_transactions.amount (orders only)
  
  // All time metrics
  allTimeNetPayouts: number;           // From amazon_payouts.total_amount (confirmed only)
  allTimeGrossRevenue: number;         // From amazon_transactions.amount (orders only)
  
  // Growth metrics
  payoutGrowthRate: number;            // 6 month vs 6 month comparison
  
  // Raw data access if needed
  confirmedPayouts: any[];
  allTransactions: any[];
  
  // Loading states
  isLoading: boolean;
}

export const useAmazonRevenue = (): AmazonRevenue & { refetch: () => void } => {
  const today = startOfDay(new Date());
  const last30DaysStart = addDays(today, -30);
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const previousMonthStart = startOfMonth(addDays(today, -30));
  const previousMonthEnd = endOfMonth(addDays(today, -30));
  const sixMonthsAgo = addDays(today, -182);
  const oneYearAgo = addDays(today, -365);

  // Fetch Amazon payouts (NET amounts after fees)
  const { data: payouts = [], isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery({
    queryKey: ['amazon-revenue-payouts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('amazon_payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('payout_date', { ascending: false });

      if (error) {
        console.error('[useAmazonRevenue] Error fetching payouts:', error);
        return [];
      }

      return data || [];
    },
  });

  // Fetch Amazon transactions (GROSS amounts before fees)
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['amazon-revenue-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('transaction_type', 'Order')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('[useAmazonRevenue] Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },
  });

  const isLoading = payoutsLoading || transactionsLoading;

  // Filter confirmed payouts only
  const confirmedPayouts = payouts.filter(p => p.status === 'confirmed');

  // Calculate Last 30 Days NET Payouts (confirmed only)
  const last30DaysNetPayouts = confirmedPayouts
    .filter(payout => {
      const payoutDate = new Date(payout.payout_date);
      return isWithinInterval(payoutDate, { start: last30DaysStart, end: today });
    })
    .reduce((sum, payout) => sum + Number(payout.total_amount || 0), 0);

  // Calculate Last 30 Days GROSS Revenue (orders only)
  const last30DaysGrossRevenue = transactions
    .filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return isWithinInterval(txDate, { start: last30DaysStart, end: today });
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Calculate Current Month NET Payouts (confirmed only)
  const currentMonthNetPayouts = confirmedPayouts
    .filter(payout => {
      const payoutDate = new Date(payout.payout_date);
      return isWithinInterval(payoutDate, { start: currentMonthStart, end: currentMonthEnd });
    })
    .reduce((sum, payout) => sum + Number(payout.total_amount || 0), 0);

  // Calculate Current Month GROSS Revenue (orders only)
  const currentMonthGrossRevenue = transactions
    .filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return isWithinInterval(txDate, { start: currentMonthStart, end: currentMonthEnd });
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Calculate Previous Month NET Payouts (confirmed only)
  const previousMonthNetPayouts = confirmedPayouts
    .filter(payout => {
      const payoutDate = new Date(payout.payout_date);
      return isWithinInterval(payoutDate, { start: previousMonthStart, end: previousMonthEnd });
    })
    .reduce((sum, payout) => sum + Number(payout.total_amount || 0), 0);

  // Calculate Previous Month GROSS Revenue (orders only)
  const previousMonthGrossRevenue = transactions
    .filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return isWithinInterval(txDate, { start: previousMonthStart, end: previousMonthEnd });
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Calculate All Time NET Payouts (confirmed only)
  const allTimeNetPayouts = confirmedPayouts
    .reduce((sum, payout) => sum + Number(payout.total_amount || 0), 0);

  // Calculate All Time GROSS Revenue (orders only)
  const allTimeGrossRevenue = transactions
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Calculate Payout Growth Rate (6 months vs 6 months comparison)
  const recentPayouts = confirmedPayouts
    .filter(p => {
      const payoutDate = new Date(p.payout_date);
      return payoutDate >= sixMonthsAgo;
    })
    .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const olderPayouts = confirmedPayouts
    .filter(p => {
      const payoutDate = new Date(p.payout_date);
      return payoutDate >= oneYearAgo && payoutDate < sixMonthsAgo;
    })
    .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const payoutGrowthRate = olderPayouts > 0 
    ? ((recentPayouts - olderPayouts) / olderPayouts) * 100 
    : 0;

  const refetch = () => {
    refetchPayouts();
    refetchTransactions();
  };

  return {
    last30DaysNetPayouts,
    last30DaysGrossRevenue,
    currentMonthNetPayouts,
    currentMonthGrossRevenue,
    previousMonthNetPayouts,
    previousMonthGrossRevenue,
    allTimeNetPayouts,
    allTimeGrossRevenue,
    payoutGrowthRate,
    confirmedPayouts,
    allTransactions: transactions,
    isLoading,
    refetch,
  };
};
