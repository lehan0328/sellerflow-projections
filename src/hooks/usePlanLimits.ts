import { useState, useEffect } from 'react';
import { useSubscription, PRICING_PLANS } from './useSubscription';
import { useTrialAddonUsage } from './useTrialAddonUsage';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'starter' | 'growing' | 'professional' | 'enterprise';

interface PlanLimits {
  bankConnections: number;
  amazonConnections: number;
  name: string;
  price: number;
  revenueMin: number;
  revenueMax: number;
}

interface CurrentUsage {
  bankConnections: number;
  amazonConnections: number;
}

// Map subscription tiers to plan limits
const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    bankConnections: 2,
    amazonConnections: 1,
    name: 'Starter',
    price: PRICING_PLANS.starter.price,
    revenueMin: 0,
    revenueMax: 20000
  },
  growing: {
    bankConnections: 3,
    amazonConnections: 1,
    name: 'Growing',
    price: 59,
    revenueMin: 20001,
    revenueMax: 100000
  },
  professional: {
    bankConnections: 4,
    amazonConnections: 1,
    name: 'Professional', 
    price: PRICING_PLANS.professional.price,
    revenueMin: 100001,
    revenueMax: 200000
  },
  enterprise: {
    bankConnections: 5,
    amazonConnections: 2,
    name: 'Enterprise',
    price: 149, // Starting price, varies by revenue tier
    revenueMin: 200001,
    revenueMax: Infinity
  }
};

export const usePlanLimits = () => {
  const subscription = useSubscription();
  const { updateTrialUsage } = useTrialAddonUsage();
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage>({
    bankConnections: 0,
    amazonConnections: 0
  });

  // Map subscription plan to plan type - default to starter for free users
  const mapPlanTier = (tier: string | null): PlanType => {
    if (tier === 'starter') return 'starter';
    if (tier === 'growing') return 'growing';
    if (tier === 'professional') return 'professional';
    if (tier === 'enterprise') return 'enterprise';
    // Free users get starter limits (2 connections)
    return 'starter';
  };
  
  const currentPlan: PlanType = mapPlanTier(subscription.plan);
  const planLimits = PLAN_LIMITS[currentPlan];

  // Fetch actual usage from database (bank accounts + credit cards counted together)
  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bankAccounts, creditCards, amazonAccounts] = await Promise.all([
        supabase.from('bank_accounts').select('id', { count: 'exact' }),
        supabase.from('credit_cards').select('id', { count: 'exact' }),
        supabase.from('amazon_accounts').select('id', { count: 'exact' })
      ]);

      // Financial connections = bank accounts + credit cards
      const financialConnections = (bankAccounts.count || 0) + (creditCards.count || 0);
      const amazonCount = amazonAccounts.count || 0;

      setCurrentUsage({
        bankConnections: financialConnections, // Note: property name kept for compatibility
        amazonConnections: amazonCount
      });

      // If in trial, track addon usage beyond plan limits
      if (subscription.is_trialing) {
        // Calculate how many beyond the limit
        const bankExcess = Math.max(0, financialConnections - planLimits.bankConnections);
        const amazonExcess = Math.max(0, amazonCount - planLimits.amazonConnections);

        if (bankExcess > 0) {
          updateTrialUsage({ addonType: 'bank_account', quantity: bankExcess });
        }
        if (amazonExcess > 0) {
          updateTrialUsage({ addonType: 'amazon_account', quantity: amazonExcess });
        }
      }
    };

    fetchUsage();
  }, [subscription.is_trialing, planLimits.bankConnections, planLimits.amazonConnections]);

  // During trial, allow unlimited connections
  const canAddBankConnection = subscription.is_trialing ? true : currentUsage.bankConnections < planLimits.bankConnections;
  const canAddAmazonConnection = subscription.is_trialing ? true : currentUsage.amazonConnections < planLimits.amazonConnections;

  return {
    currentPlan,
    planLimits,
    currentUsage,
    canAddBankConnection,
    canAddAmazonConnection,
    PLAN_LIMITS,
    isInTrial: subscription.is_trialing || false,
  };
};