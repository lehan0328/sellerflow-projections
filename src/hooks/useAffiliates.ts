import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAffiliates = () => {
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get affiliate profile
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setAffiliate(affiliateData);

      if (affiliateData) {
        // Get affiliate referrals with user profile data
        const { data: referralsData } = await supabase
          .from('affiliate_referrals')
          .select(`
            *,
            referred_user:profiles!affiliate_referrals_referred_user_id_fkey(
              email,
              first_name,
              last_name,
              company_name
            )
          `)
          .eq('affiliate_id', affiliateData.id)
          .order('created_at', { ascending: false });

        setReferrals(referralsData || []);

        // Get payouts
        const { data: payoutsData } = await supabase
          .from('affiliate_payouts')
          .select('*')
          .eq('affiliate_id', affiliateData.id)
          .order('created_at', { ascending: false });

        setPayouts(payoutsData || []);
      }
    } catch (error: any) {
      console.error('Error fetching affiliate data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load affiliate data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyAsAffiliate = async (data: {
    company_name?: string;
    website?: string;
    follower_count?: string;
    audience_description: string;
    promotional_methods: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const code = user.email?.split('@')[0].toUpperCase() || `AFF${user.id.substring(0, 8)}`;

      const { error } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          affiliate_code: code,
          company_name: data.company_name,
          website: data.website,
          follower_count: data.follower_count ? parseInt(data.follower_count) : null,
          audience_description: data.audience_description,
          promotional_methods: data.promotional_methods,
        });

      if (error) throw error;

      toast({
        title: 'Application Submitted',
        description: 'Your affiliate application has been submitted for review.',
      });

      fetchAffiliateData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyAffiliateLink = () => {
    if (!affiliate?.affiliate_code) return;
    const link = `${window.location.origin}/?aff=${affiliate.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copied!',
      description: 'Affiliate link copied to clipboard',
    });
  };

  return {
    loading,
    affiliate,
    referrals,
    payouts,
    applyAsAffiliate,
    copyAffiliateLink,
    refreshData: fetchAffiliateData,
  };
};