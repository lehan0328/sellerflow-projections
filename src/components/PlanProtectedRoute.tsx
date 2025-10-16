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

  // Allow access if user has required plan OR is in trial
  const hasAccess = hasPlanAccess(subscription.plan, minimumPlan) || subscription.is_trialing;

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
