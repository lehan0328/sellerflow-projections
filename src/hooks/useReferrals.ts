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

      // Get referral code (don't auto-create)
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (codeData) {
        setReferralCode(codeData.code);
      }

      // Get referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);

      // Get rewards
      const { data: rewardsData } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setRewards(rewardsData);
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
    navigator.clipboard.writeText(referralCode);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard',
    });
  };

  const createReferralCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Validate code format (alphanumeric, 3-20 chars)
      const codeRegex = /^[A-Z0-9]{3,20}$/;
      if (!codeRegex.test(code)) {
        return { 
          success: false, 
          error: 'Code must be 3-20 characters, uppercase letters and numbers only' 
        };
      }

      // Try to create the code
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({ user_id: user.id, code })
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate code error
        if (error.code === '23505' || error.message.includes('unique')) {
          return { success: false, error: 'This referral code is already taken. Please try another one.' };
        }
        return { success: false, error: error.message };
      }

      setReferralCode(data.code);
      toast({
        title: 'Success!',
        description: 'Your referral code has been created',
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
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