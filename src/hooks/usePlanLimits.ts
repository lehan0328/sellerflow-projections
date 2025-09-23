import { useState, useEffect } from 'react';

export type PlanType = 'starter' | 'professional' | 'enterprise';

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

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    bankConnections: 2,
    amazonConnections: 1,
    name: 'Starter',
    price: 29
  },
  professional: {
    bankConnections: 5,
    amazonConnections: 3,
    name: 'Professional', 
    price: 79
  },
  enterprise: {
    bankConnections: 999,
    amazonConnections: 999,
    name: 'Enterprise',
    price: 199
  }
};

export const usePlanLimits = () => {
  const [currentPlan, setCurrentPlan] = useState<PlanType>('starter');
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage>({
    bankConnections: 1, // Default to 1 existing connection
    amazonConnections: 0
  });

  const planLimits = PLAN_LIMITS[currentPlan];

  const canAddBankConnection = currentUsage.bankConnections < planLimits.bankConnections;
  const canAddAmazonConnection = currentUsage.amazonConnections < planLimits.amazonConnections;

  const addBankConnection = () => {
    if (canAddBankConnection) {
      setCurrentUsage(prev => ({
        ...prev,
        bankConnections: prev.bankConnections + 1
      }));
      return true;
    }
    return false;
  };

  const addAmazonConnection = () => {
    if (canAddAmazonConnection) {
      setCurrentUsage(prev => ({
        ...prev,
        amazonConnections: prev.amazonConnections + 1
      }));
      return true;
    }
    return false;
  };

  const upgradePlan = (newPlan: PlanType) => {
    setCurrentPlan(newPlan);
  };

  return {
    currentPlan,
    planLimits,
    currentUsage,
    canAddBankConnection,
    canAddAmazonConnection,
    addBankConnection,
    addAmazonConnection,
    upgradePlan,
    PLAN_LIMITS
  };
};