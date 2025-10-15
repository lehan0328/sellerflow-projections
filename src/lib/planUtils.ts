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
  if (!userPlan) return false;
  
  const planHierarchy: Record<string, number> = {
    'starter': 1,
    'growing': 2,
    'professional': 3
  };
  
  const userPlanLevel = planHierarchy[userPlan] || 0;
  const requiredPlanLevel = planHierarchy[minimumPlan] || 0;
  
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
