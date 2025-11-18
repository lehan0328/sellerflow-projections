import { useState, useEffect } from 'react';
import { useSubscription, PRICING_PLANS } from './useSubscription';
import { useTrialAddonUsage } from './useTrialAddonUsage';
import { usePurchasedAddons } from './usePurchasedAddons';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'starter' | 'growing' | 'professional' | 'enterprise';

interface PlanLimits {
  bankConnections: number;
  amazonConnections: number;
  teamMembers: number;
  name: string;
  price: number;
  revenueMin: number;
  revenueMax: number;
}

interface CurrentUsage {
  bankConnections: number;
  amazonConnections: number;
  teamMembers: number;
}

// Map subscription tiers to plan limits
// CRITICAL: These limits MUST match PRICING_PLANS marketing features exactly
// Source of truth: /pricing page - Starter: 2, Growing: 3, Professional: 4
const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    bankConnections: 2,
    amazonConnections: 1,
    teamMembers: 0, // No additional users
    name: 'Starter',
    price: PRICING_PLANS.starter.price,
    revenueMin: 0,
    revenueMax: 20000
  },
  growing: {
    bankConnections: 3, // Matches pricing page
    amazonConnections: 1,
    teamMembers: 2, // 2 additional users
    name: 'Growing',
    price: PRICING_PLANS.growing.price,
    revenueMin: 20001,
    revenueMax: 100000
  },
  professional: {
    bankConnections: 4, // Matches pricing page
    amazonConnections: 1,
    teamMembers: 5, // 5 additional users
    name: 'Professional', 
    price: PRICING_PLANS.professional.price,
    revenueMin: 100001,
    revenueMax: 200000
  },
  enterprise: {
    bankConnections: 5,
    amazonConnections: 2,
    teamMembers: 7, // 7 additional users
    name: 'Enterprise',
    price: 149, // Starting price, varies by revenue tier
    revenueMin: 200001,
    revenueMax: Infinity
  }
};

export const usePlanLimits = () => {
  const subscription = useSubscription();
  const { updateTrialUsage } = useTrialAddonUsage();
  const { purchasedAddons } = usePurchasedAddons();
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage>({
    bankConnections: 0,
    amazonConnections: 0,
    teamMembers: 0
  });
  const [profileMaxTeamMembers, setProfileMaxTeamMembers] = useState<number | null>(null);
  const [profileMaxBankConnections, setProfileMaxBankConnections] = useState<number | null>(null);

  // Map subscription plan to plan type - default to starter for free users
  const mapPlanTier = (tier: string | null, productId: string | null): PlanType => {
    
    // Check for enterprise product IDs first (be explicit about all three)
    if (productId === 'prod_TBOiOltXIGat2d' || 
        productId === 'prod_TBOiz4xSwK3cGV' || 
        productId === 'prod_TBOiTlRX4YLU4g' ||
        (productId && productId.startsWith('prod_TBOi'))) {
      return 'enterprise';
    }
    
    // Check for enterprise tier strings (tier1, tier2, tier3, tier4, tier5)
    if (tier === 'tier1' || tier === 'tier2' || tier === 'tier3' || tier === 'tier4' || tier === 'tier5') {
      return 'enterprise';
    }
    
    // Check for other known product IDs from PRICING_PLANS
    if (productId === 'prod_TAcNEuRnBTaX61') return 'starter';
    if (productId === 'prod_TAcNnoGuq5Mr7X') return 'growing';
    if (productId === 'prod_TAcQOfzGbqPowf') return 'professional';
    
    // Fallback to tier-based detection
    if (tier === 'starter') return 'starter';
    if (tier === 'growing') return 'growing';
    if (tier === 'professional') return 'professional';
    if (tier === 'enterprise') return 'enterprise';
    
    // Free users get starter limits (2 connections)
    if (!subscription.isLoading) {
      console.warn('[usePlanLimits] No plan match found, defaulting to starter');
    }
    return 'starter';
  };
  
  const currentPlan: PlanType = mapPlanTier(subscription.plan_tier || subscription.plan, subscription.product_id);
  const basePlanLimits = PLAN_LIMITS[currentPlan];
  
  // Add purchased addons to plan limits
  // If profile has max_team_members or max_bank_connections set, use those instead of base plan limit
  const planLimits = {
    ...basePlanLimits,
    bankConnections: profileMaxBankConnections !== null 
      ? profileMaxBankConnections 
      : basePlanLimits.bankConnections + purchasedAddons.bank_connections,
    amazonConnections: basePlanLimits.amazonConnections + purchasedAddons.amazon_connections,
    teamMembers: profileMaxTeamMembers !== null 
      ? profileMaxTeamMembers 
      : basePlanLimits.teamMembers + purchasedAddons.team_members,
  };

  // Fetch actual usage from database (bank accounts + credit cards counted together)
  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bankAccounts, creditCards, amazonAccounts, userRoles, profile] = await Promise.all([
        supabase.from('bank_accounts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('credit_cards').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('amazon_accounts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('user_roles').select('user_id', { count: 'exact' }).neq('user_id', user.id),
        supabase.from('profiles').select('max_team_members, max_bank_connections').eq('user_id', user.id).single()
      ]);
      
      // Set profile overrides if available
      if (profile.data?.max_team_members) {
        setProfileMaxTeamMembers(profile.data.max_team_members);
      }
      if (profile.data?.max_bank_connections) {
        setProfileMaxBankConnections(profile.data.max_bank_connections);
      }
      
      console.log('[usePlanLimits] Usage counts:', {
        bankAccounts: bankAccounts.count,
        creditCards: creditCards.count,
        amazonAccounts: amazonAccounts.count,
        teamMembers: userRoles.count
      });

      // Financial connections = bank accounts + credit cards
      const financialConnections = (bankAccounts.count || 0) + (creditCards.count || 0);
      const amazonCount = amazonAccounts.count || 0;
      // Team members = user_roles count excluding the current user (account owner)
      const teamMemberCount = userRoles.count || 0;

      setCurrentUsage({
        bankConnections: financialConnections, // Note: property name kept for compatibility
        amazonConnections: amazonCount,
        teamMembers: teamMemberCount
      });

      // If in trial, track addon usage beyond plan limits
      if (subscription.is_trialing) {
        // Calculate how many beyond the limit
        const bankExcess = Math.max(0, financialConnections - planLimits.bankConnections);
        const amazonExcess = Math.max(0, amazonCount - planLimits.amazonConnections);
        const teamExcess = Math.max(0, teamMemberCount - planLimits.teamMembers);

        if (bankExcess > 0) {
          updateTrialUsage({ addonType: 'bank_account', quantity: bankExcess });
        }
        if (amazonExcess > 0) {
          updateTrialUsage({ addonType: 'amazon_account', quantity: amazonExcess });
        }
        if (teamExcess > 0) {
          updateTrialUsage({ addonType: 'user', quantity: teamExcess });
        }
      }
    };

    fetchUsage();

    // Set up real-time subscriptions to refresh when accounts change
    const bankChannel = supabase
      .channel('bank_accounts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => {
        fetchUsage();
      })
      .subscribe();

    const creditChannel = supabase
      .channel('credit_cards_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, () => {
        fetchUsage();
      })
      .subscribe();

    const amazonChannel = supabase
      .channel('amazon_accounts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_accounts' }, () => {
        fetchUsage();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bankChannel);
      supabase.removeChannel(creditChannel);
      supabase.removeChannel(amazonChannel);
    };
  }, [subscription.is_trialing, planLimits.bankConnections, planLimits.amazonConnections]);

  // During trial, allow unlimited connections
  const canAddBankConnection = subscription.is_trialing ? true : currentUsage.bankConnections < planLimits.bankConnections;
  const canAddAmazonConnection = subscription.is_trialing ? true : currentUsage.amazonConnections < planLimits.amazonConnections;
  const canAddTeamMember = subscription.is_trialing ? true : currentUsage.teamMembers < planLimits.teamMembers;

  // Check if user is over limit (not trialing and exceeded)
  const isOverBankLimit = !subscription.is_trialing && currentUsage.bankConnections > planLimits.bankConnections;
  const isOverAmazonLimit = !subscription.is_trialing && currentUsage.amazonConnections > planLimits.amazonConnections;
  const isOverTeamLimit = !subscription.is_trialing && currentUsage.teamMembers > planLimits.teamMembers;

  return {
    currentPlan,
    planLimits,
    currentUsage,
    canAddBankConnection,
    canAddAmazonConnection,
    canAddTeamMember,
    PLAN_LIMITS,
    isInTrial: subscription.is_trialing || false,
    isOverBankLimit,
    isOverAmazonLimit,
    isOverTeamLimit,
  };
};