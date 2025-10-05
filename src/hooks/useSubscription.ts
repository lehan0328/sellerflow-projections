import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ADDON_PRODUCTS = {
  bank_account: {
    name: "Additional Bank Account",
    price: 7,
    product_id: "prod_TAceumMQgcebjQ",
    price_id: "price_1SEHPSB28kMY3UseP1mWqne5",
    description: "Add one more bank/credit card connection"
  },
  amazon_account: {
    name: "Additional Amazon Account",
    price: 50,
    product_id: "prod_TAcfNXVQRUFHSC",
    price_id: "price_1SEHQLB28kMY3UseBmY7IIjx",
    description: "Add one more Amazon account connection"
  },
  user: {
    name: "Additional User",
    price: 5,
    product_id: "prod_TAcgWMdZxz6voS",
    price_id: "price_1SEHQoB28kMY3UsedGTbBbmA",
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
      "Under $20k monthly amazon payout",
      "2 bank/credit card connections",
      "1 Amazon connection",
      "Advanced forecasting workflow",
      "365-day cash flow projection",
      "Bank transaction matching",
      "Email support"
    ]
  },
  growing: {
    name: "Growing",
    price: 59,
    yearlyPrice: 590,
    product_id: "prod_TAcNnoGuq5Mr7X",
    price_id: "price_1SEH8iB28kMY3Usem3k3vElT",
    yearly_price_id: "price_1SEHZVB28kMY3Use9bH8xPlg",
    features: [
      "Under $50k monthly amazon payout",
      "4 bank/credit card connections",
      "1 Amazon connection",
      "AI insights",
      "AI PDF extractor",
      "2 additional users",
      "Advanced forecasting workflow",
      "365-day cash flow projection",
      "Bank transaction matching",
      "Basic analytics",
      "Priority support"
    ]
  },
  professional: {
    name: "Professional",
    price: 89,
    yearlyPrice: 890,
    product_id: "prod_TAcQOfzGbqPowf",
    price_id: "price_1SEHBHB28kMY3UsenQEY0qoT",
    yearly_price_id: "price_1SEHZfB28kMY3UseZKmLEcPk",
    features: [
      "Under $200k monthly amazon payout",
      "7 bank/credit card connections",
      "1 Amazon connection",
      "AI insights",
      "AI PDF extractor",
      "5 additional users",
      "Automated notifications",
      "Advanced forecasting workflow",
      "365-day cash flow projection",
      "Bank transaction matching",
      "Scenario planning",
      "Advanced analytics",
      "Priority support"
    ]
  }
} as const;

export type PlanTier = keyof typeof PRICING_PLANS;

export interface SubscriptionState {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  plan: PlanTier | null;
  isLoading: boolean;
  is_trialing?: boolean;
  trial_end?: string | null;
  discount?: {
    coupon_id: string;
    percent_off: number | null;
    amount_off: number | null;
    duration: string;
    duration_in_months: number | null;
  } | null;
  discount_ever_redeemed?: boolean;
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
  });

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscriptionState({
          subscribed: false,
          product_id: null,
          subscription_end: null,
          plan: null,
          isLoading: false,
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Handle plan override (lifetime access, special cases)
      let plan: PlanTier | null = null;
      if (data.is_override && data.plan) {
        plan = data.plan as PlanTier;
      } else if (data.product_id) {
        // Map product_id to plan tier for regular Stripe subscriptions
        const planEntry = Object.entries(PRICING_PLANS).find(
          ([, planData]) => planData.product_id === data.product_id
        );
        if (planEntry) {
          plan = planEntry[0] as PlanTier;
        }
      }

      setSubscriptionState({
        subscribed: data.subscribed || false,
        product_id: data.product_id,
        subscription_end: data.subscription_end,
        plan,
        isLoading: false,
        is_trialing: data.is_trialing || false,
        trial_end: data.trial_end || null,
        discount: data.discount || null,
        discount_ever_redeemed: data.discount_ever_redeemed || false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscriptionState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const createCheckout = async (priceId?: string, lineItems?: Array<{ price: string; quantity: number }>) => {
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

      const body = lineItems ? { lineItems } : { priceId };

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
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

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error purchasing addon:", error);
      toast({
        title: "Error",
        description: "Failed to initiate add-on purchase. Please try again.",
        variant: "destructive",
      });
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

      // Refresh subscription status
      await checkSubscription();
    } catch (error) {
      console.error("Error removing plan override:", error);
      toast({
        title: "Error",
        description: "Failed to remove plan override. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkSubscription();

    // Check subscription on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        checkSubscription();
      }, 0);
    });

    // Refresh subscription every 10 seconds
    const interval = setInterval(checkSubscription, 10000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    ...subscriptionState,
    checkSubscription,
    createCheckout,
    purchaseAddon,
    openCustomerPortal,
    removePlanOverride,
  };
};