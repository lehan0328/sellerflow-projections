import { PlanTier } from "@/hooks/useSubscription";

/**
 * Check if a user's plan qualifies for a feature based on minimum plan requirement
 * @param userPlan - The current user's plan tier
 * @param minimumPlan - The minimum plan tier required for the feature
 * @returns true if the user's plan qualifies, false otherwise
 */
export const hasPlanAccess = (
  userPlan: PlanTier | null | undefined,
  minimumPlan: 'starter' | 'growing' | 'professional'
): boolean => {
  // Always return consistent result - false if no plan
  if (!userPlan) {
    return false;
  }
  
  const planHierarchy: Record<string, number> = {
    'starter': 1,
    'growing': 2,
    'professional': 3,
    'enterprise': 4,
    'tier1': 4,
    'tier2': 4,
    'tier3': 4
  };
  
  const userPlanLevel = planHierarchy[userPlan as string];
  const requiredPlanLevel = planHierarchy[minimumPlan];
  
  // If user plan not found in hierarchy, treat as no access
  if (userPlanLevel === undefined) {
    return false;
  }
  
  return userPlanLevel >= requiredPlanLevel;
};

/**
 * Get the minimum plan name required for a feature
 * @param minimumPlan - The minimum plan tier required
 * @returns User-friendly plan name
 */
export const getPlanName = (plan: 'starter' | 'growing' | 'professional'): string => {
  const names: Record<string, string> = {
    'starter': 'Starter',
    'growing': 'Growing',
    'professional': 'Professional'
  };
  return names[plan] || plan;
};
