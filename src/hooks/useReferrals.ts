import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useReferrals = () => {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's own referral code from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('my_referral_code')
        .eq('user_id', user.id)
        .single();

      if (profileData?.my_referral_code) {
        setReferralCode(profileData.my_referral_code);

        // Get referrals - users who signed up with this code
        const { data: referralsData } = await supabase
          .from('profiles')
          .select('user_id, email, first_name, last_name, created_at, stripe_customer_id')
          .eq('referral_code', profileData.my_referral_code)
          .order('created_at', { ascending: false });

        // Map to expected format with status
        const mappedReferrals = referralsData?.map(ref => ({
          id: ref.user_id,
          email: ref.email,
          name: `${ref.first_name || ''} ${ref.last_name || ''}`.trim() || 'N/A',
          created_at: ref.created_at,
          status: ref.stripe_customer_id ? 'active' : 'trial',
        })) || [];

        setReferrals(mappedReferrals);
      }

      // Calculate rewards based on active referrals
      const activeReferralCount = referrals.filter(r => r.status === 'active').length;
      setRewards({
        active_referrals: activeReferralCount,
        discount_earned: activeReferralCount >= 3 ? 10 : 0,
      });
    } catch (error: any) {
      console.error('Error fetching referral data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralCode) return;
    const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const createReferralCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    // Referral codes are now auto-generated, this function is deprecated
    return { 
      success: false, 
      error: 'Referral codes are automatically generated. Your code is: ' + referralCode 
    };
  };

  return {
    loading,
    referralCode,
    referrals,
    rewards,
    copyReferralLink,
    createReferralCode,
    refreshData: fetchReferralData,
  };
};