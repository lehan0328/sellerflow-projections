/**
 * Plan limits for different subscription tiers
 */
export const PLAN_LIMITS = {
  starter: { bankConnections: 2, teamMembers: 0 },
  growing: { bankConnections: 3, teamMembers: 2 },
  professional: { bankConnections: 4, teamMembers: 5 },
  tier1: { bankConnections: 5, teamMembers: 7 },
  tier2: { bankConnections: 5, teamMembers: 7 },
  tier3: { bankConnections: 5, teamMembers: 7 },
  enterprise: { bankConnections: 5, teamMembers: 7 },
  lifetime: { bankConnections: 999, teamMembers: 999 },
  lifetime_access: { bankConnections: 999, teamMembers: 999 }
};

/**
 * Get the default limit for a plan
 */
export const getPlanDefault = (planTier: string | null, type: 'bank' | 'team'): number | null => {
  if (!planTier) return null;
  const limits = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS];
  if (!limits) return null;
  return type === 'bank' ? limits.bankConnections : limits.teamMembers;
};

/**
 * Get account status label and variant for display
 * This logic must match across all admin components
 */
export const getAccountStatus = (userData: {
  plan_override?: string | null;
  plan_override_reason?: string | null;
  plan_tier?: string | null;
  account_status?: string | null;
  trial_end?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_status?: string | null;
  renewal_date?: string | null;
  last_paid_date?: string | null;
  created_at?: string;
  churn_date?: string | null;
}): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  const now = new Date();
  
  // Check for admin status (website admin, not company admin)
  if (userData.plan_override === 'admin') {
    return { label: 'Admin', variant: 'default' };
  }
  
  // Check for Lifetime in plan_override_reason (manual lifetime grants by admin)
  if (userData.plan_override_reason?.toLowerCase().includes('lifetime')) {
    return { label: 'Lifetime', variant: 'default' };
  }
  
  // Check for EXPLICIT lifetime grants by admin ONLY
  if (userData.plan_override && (
    userData.plan_override === 'lifetime' || 
    userData.plan_override === 'lifetime_access'
  )) {
    return { label: 'Lifetime', variant: 'default' };
  }
  
  // Check for active Stripe subscription (paid monthly/yearly)
  if (userData.stripe_subscription_status === 'active' || userData.stripe_subscription_status === 'trialing') {
    return { label: 'Active', variant: 'default' };
  }
  
  // Enterprise tiers (tier1/tier2/tier3) without Stripe subscription
  // These are admin-granted enterprise access but NOT lifetime unless explicitly marked
  if (userData.plan_override && userData.plan_override.match(/^tier[1-3]$/)) {
    return { label: 'Active', variant: 'secondary' };
  }
  
  // If renewal_date is set and in the future, they have an active subscription
  if (userData.renewal_date && new Date(userData.renewal_date) > now) {
    return { label: 'Active', variant: 'default' };
  }
  
  // Check trial status - either trial_end is set and in future, OR user is newly created (last 7 days) without Stripe customer
  const createdAt = userData.created_at ? new Date(userData.created_at) : null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Trial if trial_end exists and is in future
  if (userData.trial_end && new Date(userData.trial_end) > now) {
    return { label: 'Trial', variant: 'secondary' };
  }
  
  // Trial if created within last 7 days and no Stripe customer (new signup in trial)
  if (createdAt && createdAt > sevenDaysAgo && !userData.stripe_customer_id) {
    return { label: 'Trial', variant: 'secondary' };
  }
  
  // Check if suspended
  if (userData.account_status === 'suspended_payment') {
    return { label: 'Suspended', variant: 'destructive' };
  }
  
  // Check if they ever had a subscription but it expired
  if (userData.stripe_customer_id || userData.last_paid_date) {
    return { label: 'Expired', variant: 'destructive' };
  }
  
  // Trial expired or never had trial
  return { label: 'Expired', variant: 'destructive' };
};

/**
 * Format plan name for display
 */
export const formatPlanName = (plan: string | null): string => {
  if (!plan) return 'None';
  
  const planNames: Record<string, string> = {
    'starter': 'Starter',
    'growing': 'Growing',
    'professional': 'Professional',
    'tier1': 'Enterprise 1 ($100k-$250k)',
    'tier2': 'Enterprise 2 ($250k-$500k)',
    'tier3': 'Enterprise 3 ($500k+)',
    'enterprise': 'Enterprise',
    'lifetime': 'Lifetime Access',
    'lifetime_access': 'Lifetime Access',
    'admin': 'Admin'
  };
  
  return planNames[plan] || plan;
};
