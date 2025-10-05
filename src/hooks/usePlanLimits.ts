import { useState, useEffect } from 'react';
import { useSubscription, PRICING_PLANS } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'starter' | 'growing' | 'professional' | 'enterprise';

interface PlanLimits {
  bankConnections: number;
  amazonConnections: number;
  name: string;
  price: number;
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
    price: PRICING_PLANS.starter.price
  },
  growing: {
    bankConnections: 4,
    amazonConnections: 1,
    name: 'Growing',
    price: 59
  },
  professional: {
    bankConnections: 6,
    amazonConnections: 1,
    name: 'Professional', 
    price: PRICING_PLANS.professional.price
  },
  enterprise: {
    bankConnections: 999,
    amazonConnections: 999,
    name: 'Enterprise',
    price: 199
  }
};

export const usePlanLimits = () => {
  const subscription = useSubscription();
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

  // Fetch actual usage from database (including credit cards)
  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bankAccounts, creditCards, amazonAccounts] = await Promise.all([
        supabase.from('bank_accounts').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('credit_cards').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('amazon_accounts').select('id', { count: 'exact' }).eq('user_id', user.id)
      ]);

      setCurrentUsage({
        bankConnections: (bankAccounts.count || 0) + (creditCards.count || 0),
        amazonConnections: amazonAccounts.count || 0
      });
    };

    fetchUsage();
  }, []);

  const canAddBankConnection = currentUsage.bankConnections < planLimits.bankConnections;
  const canAddAmazonConnection = currentUsage.amazonConnections < planLimits.amazonConnections;

  return {
    currentPlan,
    planLimits,
    currentUsage,
    canAddBankConnection,
    canAddAmazonConnection,
    PLAN_LIMITS
  };
};