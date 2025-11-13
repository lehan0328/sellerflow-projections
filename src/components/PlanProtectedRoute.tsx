import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { hasPlanAccess } from "@/lib/planUtils";

interface PlanProtectedRouteProps {
  children: ReactNode;
  minimumPlan: 'starter' | 'growing' | 'professional';
  redirectTo?: string;
}

export function PlanProtectedRoute({ 
  children, 
  minimumPlan,
  redirectTo = '/upgrade-plan' 
}: PlanProtectedRouteProps) {
  const subscription = useSubscription();

  // Allow access if: (user's plan_tier >= required tier) OR (user is in trial)
  // Use plan_tier for clean separation between trial status and plan level
  const userPlanTier = subscription.plan_tier || subscription.plan || 'starter';
  const hasAccess = hasPlanAccess(userPlanTier as any, minimumPlan) || subscription.is_trialing;

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
