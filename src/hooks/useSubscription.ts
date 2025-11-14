import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ADDON_PRODUCTS = {
  bank_account: {
    name: "Additional Bank Account",
    price: 10,
    product_id: "prod_TBP7lVqLYQDIU8",
    price_id: "price_1SF2J6B28kMY3UseQW6ATKt1",
    yearly_price_id: "price_1SF2TuB28kMY3Use4DiYnkp6",
    description: "Add one more bank/credit card connection"
  },
  amazon_account: {
    name: "Additional Amazon Account",
    price: 50,
    product_id: "prod_TAcfNXVQRUFHSC",
    price_id: "price_1SEHQLB28kMY3UseBmY7IIjx",
    yearly_price_id: "price_1SF2U4B28kMY3Usez8rm1I7f",
    description: "Add one more Amazon account connection"
  },
  user: {
    name: "Additional User",
    price: 5,
    product_id: "prod_TAcgWMdZxz6voS",
    price_id: "price_1SEHQoB28kMY3UsedGTbBbmA",
    yearly_price_id: "price_1SF2UFB28kMY3UseHmvICumx",
    description: "Add one more user to your account"
  }
} as const;

export const PRICING_PLANS = {
  starter: {
    name: "Starter",
    price: 29,
    yearlyPrice: 290,
    product_id: "prod_TAcNEuRnBTaX61",
    price_id: "price_1SEH8NB28kMY3UseBj2w9HgH",
    yearly_price_id: "price_1SEHZGB28kMY3UseCkWIlnWw",
    features: [
      "Under $10k monthly Amazon payout",
      "2 bank/credit card connections",
      "1 Amazon connection",
      "✨ Smart Purchase Planning",
      "✨ Safe Spending Power",
      "✨ Buying Opportunity Projection",
      "✨ Payout Forecasting",
      "Advanced forecasting workflow",
      "90-day cashflow projection",
      "Bank transaction matching",
      "Email support",
      "❌ Additional users",
      "❌ AI PDF extractor",
      "❌ Document storage",
      "❌ Scenario planning"
    ]
  },
  growing: {
    name: "Growing",
    price: 79,
    yearlyPrice: 790,
    product_id: "prod_TAcNnoGuq5Mr7X",
    price_id: "price_1SSeo2B28kMY3UseFL1piWcg",
    yearly_price_id: "price_1SSeqYB28kMY3UsedmvC1SyG",
    features: [
      "Under $50k monthly Amazon payout",
      "3 bank/credit card connections",
      "1 Amazon connection",
      "✨ Smart Purchase Planning",
      "✨ Safe Spending Power",
      "✨ Buying Opportunity Projection",
      "✨ Payout Forecasting",
      "AI PDF extractor",
      "2 additional users",
      "Advanced forecasting workflow",
      "90-day cashflow projection",
      "Bank transaction matching",
      "Basic analytics",
      "Priority support",
      "❌ Document storage",
      "❌ Scenario planning"
    ]
  },
  professional: {
    name: "Professional",
    price: 97,
    yearlyPrice: 970,
    product_id: "prod_TAcQOfzGbqPowf",
    price_id: "price_1SSeroB28kMY3UseleImRSzb",
    yearly_price_id: "price_1SSesoB28kMY3UseVpnTVwkK",
    features: [
      "Under $100k monthly Amazon payout",
      "4 bank/credit card connections",
      "1 Amazon connection",
      "✨ Smart Purchase Planning",
      "✨ Safe Spending Power",
      "✨ Buying Opportunity Projection",
      "✨ Payout Forecasting",
      "AI PDF extractor",
      "Document storage",
      "5 additional users",
      "Advanced forecasting workflow",
      "90-day cashflow projection",
      "Bank transaction matching",
      "Scenario planning",
      "Advanced analytics",
      "Priority support"
    ]
  }
} as const;

export const ENTERPRISE_TIERS = {
  tier1: {
    name: "Enterprise - Tier 1",
    revenue: "$100k - $250k monthly payout",
    price: 149,
    yearlyPrice: 1490,
    priceId: "price_1SF1uxB28kMY3Use2W39zzO4",
    yearlyPriceId: "price_1SF2OZB28kMY3Use6rLIlv5g",
    productId: "prod_TBOiOltXIGat2d",
    features: [
      "5 bank/credit card connections (+ add more)",
      "2 Amazon connections",
      "7 additional users",
      "All Professional features",
      "1:1 hands-on setup with team member",
      "Dedicated account manager"
    ]
  },
  tier2: {
    name: "Enterprise - Tier 2",
    revenue: "$250k - $500k monthly payout",
    price: 299,
    yearlyPrice: 2990,
    priceId: "price_1SF1v8B28kMY3UseVLxkFEvr",
    yearlyPriceId: "price_1SF2OnB28kMY3UseHsTG7DNZ",
    productId: "prod_TBOiz4xSwK3cGV",
    features: [
      "5 bank/credit card connections (+ add more)",
      "2 Amazon connections",
      "7 additional users",
      "All Professional features",
      "1:1 hands-on setup with team member",
      "Dedicated account manager"
    ]
  },
  tier3: {
    name: "Enterprise - Tier 3",
    revenue: "$500k+ monthly payout",
    price: 499,
    yearlyPrice: 4990,
    priceId: "price_1SF1vLB28kMY3UseRb0kIQNY",
    yearlyPriceId: "price_1SF2OxB28kMY3UseUanKSxA2",
    productId: "prod_TBOiTlRX4YLU4g",
    features: [
      "5 bank/credit card connections (+ add more)",
      "2 Amazon connections",
      "7 additional users",
      "All Professional features",
      "1:1 hands-on setup with team member",
      "Dedicated account manager"
    ]
  }
} as const;

export type PlanTier = keyof typeof PRICING_PLANS | keyof typeof ENTERPRISE_TIERS | 'lifetime';

export interface SubscriptionState {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  plan: PlanTier | null;
  plan_tier?: 'professional' | 'growing' | 'starter' | 'enterprise';
  isLoading: boolean;
  is_trialing?: boolean;
  trial_end?: string | null;
  trial_start?: string | null;
  trial_expired?: boolean;
  billing_interval?: string | null;
  current_period_start?: string | null;
  price_amount?: number | null;
  currency?: string | null;
  discount?: {
    coupon_id: string;
    percent_off: number | null;
    amount_off: number | null;
    duration: string;
    duration_in_months: number | null;
  } | null;
  discount_ever_redeemed?: boolean;
  payment_failed?: boolean;
  is_expired?: boolean;
}

// Cache configuration
const CACHE_KEY = 'auren_subscription_cache';
const CACHE_VERSION = 2; // Increment to bust cache after backend changes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (checks are less frequent now)

interface CachedSubscription extends SubscriptionState {
  cachedAt: number;
  version?: number;
}

export const useSubscription = () => {
  const { toast } = useToast();
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
    plan: null,
    isLoading: true,
    is_trialing: false,
    trial_end: null,
    trial_start: null,
  });
  const [paymentMethod, setPaymentMethod] = useState<{ brand: string; last4: string } | null>(null);

  // Load from cache
  const loadFromCache = (): CachedSubscription | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const parsed: CachedSubscription = JSON.parse(cached);
      
      // Bust cache if version changed (backend updates)
      if (!parsed.version || parsed.version !== CACHE_VERSION) {
        console.log('[Subscription] Cache version mismatch, clearing cache');
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      const age = Date.now() - parsed.cachedAt;
      
      // Return cached data if less than 5 minutes old
      if (age < CACHE_DURATION) {
        return parsed;
      }
      
      // Clear expired cache
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  };

  // Save to cache
  const saveToCache = (state: SubscriptionState) => {
    try {
      const cached: CachedSubscription = {
        ...state,
        cachedAt: Date.now(),
        version: CACHE_VERSION,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error("Failed to cache subscription:", error);
    }
  };

  // Clear cache (called on explicit actions like checkout)
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  const checkSubscription = async (forceRefresh = false) => {
    console.log('[SUBSCRIPTION] Starting checkSubscription, forceRefresh:', forceRefresh);
    try {
      // Check for session FIRST before anything else
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('[SUBSCRIPTION] No session found or session error:', sessionError);
        const state = {
          subscribed: false,
          product_id: null,
          subscription_end: null,
          plan: null,
          isLoading: false,
          is_trialing: false,
          trial_end: null,
          trial_expired: false,
          billing_interval: null,
          current_period_start: null,
          price_amount: null,
          currency: null,
          discount: null,
          discount_ever_redeemed: false,
          payment_failed: false,
          is_expired: false,
        };
        setSubscriptionState(state);
        saveToCache(state);
        return;
      }

      // Try to load from cache (only if user is authenticated)
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          console.log('[SUBSCRIPTION] Using cached data:', cached);
          const { cachedAt, ...state } = cached;
          setSubscriptionState(state);
          return;
        }
      }
      
      console.log('[SUBSCRIPTION] Session valid, calling check-subscription edge function');

      let { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('[SUBSCRIPTION] check-subscription response:', { data, error });

      // Handle 401 errors by attempting session refresh
      if (error && (error as any)?.status === 401) {
        console.log('[SUBSCRIPTION] Session expired, attempting refresh...');
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('[SUBSCRIPTION] Session refresh failed, redirecting to login:', refreshError);
          // Clear the invalid session and cache
          await supabase.auth.signOut();
          clearCache();
          // Force redirect to auth page
          window.location.href = '/auth';
          return;
        }
        
        // Retry with refreshed session
        console.log('[SUBSCRIPTION] Session refreshed successfully, retrying...');
        const { data: retryData, error: retryError } = await supabase.functions.invoke("check-subscription", {
          headers: {
            Authorization: `Bearer ${refreshedSession.access_token}`,
          },
        });
        
        if (retryError) {
          console.error('[SUBSCRIPTION] Retry failed after refresh:', retryError);
          await supabase.auth.signOut();
          clearCache();
          window.location.href = '/auth';
          return;
        }
        
        // Use the retry data for processing below
        data = retryData;
        error = null;
      }

      if (error) {
        console.error('[SUBSCRIPTION] Error fetching subscription:', error);
        throw error;
      }

      if (!data) {
        console.error('[SUBSCRIPTION] No data received from check-subscription');
        throw new Error('No data received from subscription check');
      }
        
        // Continue with data - use plan_tier from backend if available
        let plan: PlanTier | null = null;
        if (data.is_override && data.plan) {
          plan = data.plan as PlanTier;
        } else if (data.plan_tier) {
          // Use explicit plan_tier from backend (for trial and paid users)
          const tierMap: Record<string, PlanTier> = {
            'professional': 'professional',
            'growing': 'growing',
            'starter': 'starter',
            'enterprise': 'tier1' // Map enterprise to tier1 for compatibility
          };
          plan = tierMap[data.plan_tier] || 'starter';
        } else if (data.is_trialing) {
          plan = 'professional';
        } else if (data.product_id) {
          // First check PRICING_PLANS (starter, growing, professional)
          let planEntry = Object.entries(PRICING_PLANS).find(
            ([, planData]) => planData.product_id === data.product_id
          );
          
          if (planEntry) {
            plan = planEntry[0] as PlanTier;
          } else {
            // If no match, check ENTERPRISE_TIERS
            const enterpriseEntry = Object.entries(ENTERPRISE_TIERS).find(
              ([, tierData]) => tierData.productId === data.product_id
            );
            
            if (enterpriseEntry) {
              plan = enterpriseEntry[0] as PlanTier; // Use the actual tier key (tier1, tier2, tier3)
              console.log('[SUBSCRIPTION] Enterprise tier detected:', plan);
            }
          }
        }

        const paymentFailed = data.subscriptionStatus === 'past_due' || data.subscriptionStatus === 'unpaid';
        const isExpired = data.subscription_end ? new Date(data.subscription_end) < new Date() : false;
        const shouldBlockAccess = paymentFailed && isExpired;
        const trialExpired = data.trial_expired || false;

        const state = {
          subscribed: data.subscribed || false,
          product_id: data.product_id,
          subscription_end: data.subscription_end,
          plan,
          plan_tier: data.plan_tier,
          isLoading: false,
          is_trialing: data.is_trialing || false,
          trial_end: data.trial_end || null,
          trial_start: data.trial_start || null,
          trial_expired: trialExpired,
          billing_interval: data.billing_interval || null,
          current_period_start: data.current_period_start || null,
          price_amount: data.price_amount || null,
          currency: data.currency || null,
          discount: data.discount || null,
          discount_ever_redeemed: data.discount_ever_redeemed || false,
          payment_failed: data.payment_failed || false,
          is_expired: shouldBlockAccess || trialExpired,
        };
        
        setSubscriptionState(state);
        saveToCache(state);

        if (data.subscribed && session) {
          try {
            const { data: pmData } = await supabase.functions.invoke("get-payment-method", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (pmData?.brand && pmData?.last4) {
              setPaymentMethod({ brand: pmData.brand, last4: pmData.last4 });
            }
          } catch (error) {
            console.error("Failed to fetch payment method:", error);
          }
        }
      } catch (error) {
        plan = data.plan as PlanTier;
      } else if (data.plan_tier) {
        // Use explicit plan_tier from backend (for trial and paid users)
        const tierMap: Record<string, PlanTier> = {
          'professional': 'professional',
          'growing': 'growing',
          'starter': 'starter',
          'enterprise': 'tier1' // Map enterprise to tier1 for compatibility
        };
        plan = tierMap[data.plan_tier] || 'starter';
      } else if (data.is_trialing) {
        // Fallback: trial users are professional
        plan = 'professional';
      } else if (data.product_id) {
        // Map product_id to plan tier for regular Stripe subscriptions
        // First check PRICING_PLANS (starter, growing, professional)
        const availableProducts = Object.entries(PRICING_PLANS).map(([planName, planData]) => ({
          plan: planName,
          product_id: planData.product_id
        }));
        console.log('[SUBSCRIPTION] Matching product_id:', data.product_id, 'against available:', availableProducts);
        
        let planEntry = Object.entries(PRICING_PLANS).find(
          ([, planData]) => planData.product_id === data.product_id
        );
        
        if (planEntry) {
          plan = planEntry[0] as PlanTier;
          console.log('[SUBSCRIPTION] Match found:', plan);
        } else {
          // If no match, check ENTERPRISE_TIERS
          const enterpriseEntry = Object.entries(ENTERPRISE_TIERS).find(
            ([, tierData]) => tierData.productId === data.product_id
          );
          
          if (enterpriseEntry) {
            plan = enterpriseEntry[0] as PlanTier; // Use the actual tier key (tier1, tier2, tier3)
            console.log('[SUBSCRIPTION] Enterprise tier detected:', plan, 'Product ID:', data.product_id);
          } else {
            console.warn('[SUBSCRIPTION] No matching plan found for product_id:', data.product_id, 'Available products:', availableProducts);
          }
        }
      }

      // Determine if payment failed AND subscription is expired
      const paymentFailed = data.subscriptionStatus === 'past_due' || data.subscriptionStatus === 'unpaid';
      const isExpired = data.subscription_end ? new Date(data.subscription_end) < new Date() : false;
      const shouldBlockAccess = paymentFailed && isExpired;
      
      // Also check if trial expired (for users without payment method)
      const trialExpired = data.trial_expired || false;
      
      console.log('[SUBSCRIPTION] Calculated flags:', { 
        paymentFailed, 
        isExpired, 
        shouldBlockAccess, 
        trialExpired,
        subscriptionStatus: data.subscriptionStatus,
        subscription_end: data.subscription_end
      });

      const state = {
        subscribed: data.subscribed || false,
        product_id: data.product_id,
        subscription_end: data.subscription_end,
        plan,
        plan_tier: data.plan_tier,
        isLoading: false,
        is_trialing: data.is_trialing || false,
        trial_end: data.trial_end || null,
        trial_start: data.trial_start || null,
        trial_expired: trialExpired,
        billing_interval: data.billing_interval || null,
        current_period_start: data.current_period_start || null,
        price_amount: data.price_amount || null,
        currency: data.currency || null,
        discount: data.discount || null,
        discount_ever_redeemed: data.discount_ever_redeemed || false,
        payment_failed: data.payment_failed || false,
        is_expired: shouldBlockAccess || trialExpired,
      };
      
      setSubscriptionState(state);
      saveToCache(state);

      // Fetch payment method if subscribed
      if (data.subscribed && session) {
        try {
          const { data: pmData } = await supabase.functions.invoke("get-payment-method", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (pmData?.brand && pmData?.last4) {
            setPaymentMethod({ brand: pmData.brand, last4: pmData.last4 });
          }
        } catch (error) {
          console.error("Failed to fetch payment method:", error);
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      
      // If error message indicates session expired, clear session completely
      if (error instanceof Error && error.message.includes("Session expired")) {
        console.log('[SUBSCRIPTION] Clearing invalid session and forcing redirect');
        await supabase.auth.signOut();
        // ProtectedRoute will detect no session and redirect to /auth
      }
      
      const state = {
        subscribed: false,
        product_id: null,
        subscription_end: null,
        plan: null,
        isLoading: false,
        is_trialing: false,
        trial_end: null,
      };
      setSubscriptionState(state);
      saveToCache(state);
    }
  };

  const createCheckout = async (priceId?: string, lineItems?: Array<{ price: string; quantity: number }>, proratedAmount?: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upgrade your plan.",
          variant: "destructive",
        });
        return;
      }

      const body = lineItems ? { lineItems } : { priceId, proratedAmount };

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Clear cache since subscription will change
        clearCache();
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: "Failed to initiate checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const purchaseAddon = async (priceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to purchase add-ons.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("add-subscription-items", {
        body: { 
          lineItems: [{ price: priceId, quantity: 1 }]
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success!",
          description: data.message || "Add-on successfully added to your subscription",
        });
        // Clear cache and refresh subscription
        clearCache();
        await checkSubscription(true);
      }
    } catch (error) {
      console.error("Error purchasing addon:", error);
      toast({
        title: "Error",
        description: error.userMessage || "Failed to add item to subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const purchaseAddons = async (lineItems: Array<{ price: string; quantity: number }>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to purchase add-ons.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("add-subscription-items", {
        body: { lineItems },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success!",
          description: data.message || "Add-ons successfully added to your subscription",
        });
        // Clear cache and refresh subscription
        clearCache();
        await checkSubscription(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error purchasing addons:", error);
      toast({
        title: "Error",
        description: error.userMessage || "Failed to add items to subscription. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };


  const openCustomerPortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to manage your subscription.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const upgradeSubscription = async (newPriceId: string): Promise<boolean | { useCheckout: boolean; newPriceId: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upgrade your plan.",
          variant: "destructive",
        });
        return false;
      }

      const { data, error } = await supabase.functions.invoke("upgrade-subscription", {
        body: { newPriceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Check if this is an interval change that requires checkout
      if (data?.useCheckout) {
        return { useCheckout: true, newPriceId: data.newPriceId };
      }

      // Check for payment failure (402 status or error with payment declined message)
      if (error) {
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('Payment declined') || errorMsg.includes('upgrade failed')) {
          toast({
            title: "Payment Declined",
            description: "Your payment was declined. Your original plan remains active. Please update your payment method.",
            variant: "destructive",
          });
          return false;
        }
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Success!",
          description: `Subscription upgraded successfully. ${data.amountCharged ? `Charged $${(data.amountCharged / 100).toFixed(2)}` : ''}`,
        });
        // Clear cache and refresh subscription
        clearCache();
        await checkSubscription(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      toast({
        title: "Payment Failed",
        description: "Failed to upgrade subscription. Your original plan remains active.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removePlanOverride = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to manage your plan.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("remove-plan-override", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Plan override removed. You can now subscribe to a regular plan.",
      });

      // Clear cache and refresh subscription status
      clearCache();
      await checkSubscription(true);
    } catch (error) {
      console.error("Error removing plan override:", error);
      toast({
        title: "Error",
        description: "Failed to remove plan override. Please try again.",
        variant: "destructive",
      });
    }
  };

  const upgradeToAnnual = async (annualPriceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upgrade your plan.",
          variant: "destructive",
        });
        return false;
      }

      // Schedule upgrade at end of billing cycle - no proration
      createCheckout(annualPriceId);
      return true;
    } catch (error) {
      console.error("Error upgrading to annual:", error);
      toast({
        title: "Error",
        description: "Failed to upgrade to annual billing. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Smart upgrade that schedules changes at end of billing cycle
   * - No immediate charges
   * - Upgrade activates when current subscription renews
   */
  const smartUpgrade = async (targetPriceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upgrade your plan.",
          variant: "destructive",
        });
        return false;
      }

      // Schedule upgrade at end of billing cycle - no proration
      createCheckout(targetPriceId);
      return true;

    } catch (error) {
      console.error("Error in smart upgrade:", error);
      toast({
        title: "Error",
        description: "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    // Only check subscription if we have a valid session
    const initializeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        checkSubscription(true); // Force fresh read on mount to respect plan overrides
      }
    };
    
    initializeSubscription();

    // Check subscription on auth state change only (cache will handle the rest)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Only refresh on significant auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        clearCache();
        checkSubscription(true);
      } else if (event === 'SIGNED_OUT') {
        clearCache();
        setSubscriptionState({
          subscribed: false,
          product_id: null,
          subscription_end: null,
          plan: null,
          isLoading: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    ...subscriptionState,
    checkSubscription,
    createCheckout,
    purchaseAddon,
    purchaseAddons,
    openCustomerPortal,
    removePlanOverride,
    upgradeSubscription,
    upgradeToAnnual,
    smartUpgrade, // New unified upgrade function
    paymentMethod,
    clearCache,
  };
};