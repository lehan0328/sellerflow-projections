import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { 
  ArrowLeft,
  Shield,
  Check,
  Star,
  Settings,
  ShoppingCart,
  Plus,
  Minus,
  XCircle,
  TrendingUp,
  ArrowDown,
  X,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PRICING_PLANS, ADDON_PRODUCTS, ENTERPRISE_TIERS } from "@/hooks/useSubscription";
import { useTrialAddonUsage } from "@/hooks/useTrialAddonUsage";
import { TrialAddonNotice } from "@/components/TrialAddonNotice";
import { CancellationFlow } from "@/components/subscription/CancellationFlow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeConfirmDialog } from "@/components/UpgradeConfirmDialog";

interface CartItem {
  priceId: string;
  name: string;
  price: number;
  quantity: number;
}

interface PendingUpgrade {
  priceId: string;
  planName: string;
  amount: number;
  isYearly: boolean;
}

const UpgradePlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed, plan, subscription_end, is_trialing, trial_end, discount, discount_ever_redeemed, billing_interval, current_period_start, price_amount, currency, createCheckout, purchaseAddon, purchaseAddons, openCustomerPortal, removePlanOverride, checkSubscription, isLoading } = useSubscription();
  const { calculatePostTrialCost } = useTrialAddonUsage();
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<keyof typeof ENTERPRISE_TIERS>("tier1");
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({
    bank_account: 0,
    amazon_account: 0,
    user: 0
  });
  const [pendingUpgrade, setPendingUpgrade] = useState<PendingUpgrade | null>(null);

  // Fetch profile to get trial dates
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('trial_start, trial_end')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Check for upgraded query parameter and refresh subscription
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'upgraded') {
      // Force refresh subscription status after upgrade
      setTimeout(() => {
        checkSubscription(true);
      }, 1000);
      
      // Clean up URL
      window.history.replaceState({}, '', '/upgrade-plan');
    }
  }, [checkSubscription]);


  const plans = [
    {
      key: "starter",
      name: PRICING_PLANS.starter.name,
      price: PRICING_PLANS.starter.price,
      yearlyPrice: PRICING_PLANS.starter.yearlyPrice,
      priceId: PRICING_PLANS.starter.price_id,
      yearlyPriceId: PRICING_PLANS.starter.yearly_price_id,
      features: PRICING_PLANS.starter.features,
      popular: false,
      savings: "$58"
    },
    {
      key: "growing",
      name: PRICING_PLANS.growing.name,
      price: PRICING_PLANS.growing.price,
      yearlyPrice: PRICING_PLANS.growing.yearlyPrice,
      priceId: PRICING_PLANS.growing.price_id,
      yearlyPriceId: PRICING_PLANS.growing.yearly_price_id,
      features: PRICING_PLANS.growing.features,
      popular: true,
      savings: "$118"
    },
    {
      key: "professional",
      name: PRICING_PLANS.professional.name,
      price: PRICING_PLANS.professional.price,
      yearlyPrice: PRICING_PLANS.professional.yearlyPrice,
      priceId: PRICING_PLANS.professional.price_id,
      yearlyPriceId: PRICING_PLANS.professional.yearly_price_id,
      features: PRICING_PLANS.professional.features,
      popular: false,
      savings: "$178"
    }
  ];

  const handleUpgrade = (priceId: string, planName: string, proratedAmount?: number, isYearlyPlan?: boolean) => {
    // Show confirmation dialog for existing subscribers
    if (subscribed && !is_trialing) {
      setPendingUpgrade({
        priceId,
        planName,
        amount: proratedAmount || 0,
        isYearly: isYearlyPlan || false,
      });
    } else {
      createCheckout(priceId, undefined, proratedAmount);
    }
  };

  const confirmUpgrade = () => {
    if (pendingUpgrade) {
      createCheckout(pendingUpgrade.priceId, undefined, pendingUpgrade.amount);
      setPendingUpgrade(null);
    }
  };

  const handlePurchaseAddon = (priceId: string) => {
    purchaseAddon(priceId);
  };

  const getCurrentPriceId = (planItem: typeof plans[0]) => {
    return isYearly ? planItem.yearlyPriceId : planItem.priceId;
  };

  const addons = [
    {
      key: "bank_account",
      name: ADDON_PRODUCTS.bank_account.name,
      price: ADDON_PRODUCTS.bank_account.price,
      priceId: ADDON_PRODUCTS.bank_account.price_id,
      description: ADDON_PRODUCTS.bank_account.description,
    },
    {
      key: "amazon_account",
      name: ADDON_PRODUCTS.amazon_account.name,
      price: ADDON_PRODUCTS.amazon_account.price,
      priceId: ADDON_PRODUCTS.amazon_account.price_id,
      description: ADDON_PRODUCTS.amazon_account.description,
    },
    {
      key: "user",
      name: ADDON_PRODUCTS.user.name,
      price: ADDON_PRODUCTS.user.price,
      priceId: ADDON_PRODUCTS.user.price_id,
      description: ADDON_PRODUCTS.user.description,
    }
  ];

  const handleCheckoutAddons = async () => {
    // Build line items from quantities > 0
    const lineItems = addons
      .filter(addon => addonQuantities[addon.key] > 0)
      .map(addon => ({
        price: addon.priceId,
        quantity: addonQuantities[addon.key]
      }));
    
    if (lineItems.length === 0) {
      return;
    }
    
    const success = await purchaseAddons(lineItems);
    
    // Reset quantities after successful purchase
    if (success) {
      setAddonQuantities({
        bank_account: 0,
        amazon_account: 0,
        user: 0
      });
    }
  };

  const cartTotal = addons.reduce((sum, addon) => 
    sum + (addon.price * addonQuantities[addon.key]), 0
  );

  const totalItems = Object.values(addonQuantities).reduce((sum, qty) => sum + qty, 0);

  // Determine the next higher tier
  const planHierarchy = { starter: 1, growing: 2, professional: 3 };
  const currentPlanLevel = plan ? planHierarchy[plan] : 0;
  const nextTierKey = Object.entries(planHierarchy).find(([_, level]) => level === currentPlanLevel + 1)?.[0];
  const nextTier = nextTierKey ? plans.find(p => p.key === nextTierKey) : null;
  const currentTierData = plan ? plans.find(p => p.key === plan) : null;

  // Show loading state while subscription data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col items-center text-center space-y-4 animate-fade-in">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="self-start"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center justify-center space-x-2">
                  <Shield className="h-8 w-8" />
                  <span>Upgrade Plan</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground animate-pulse">Loading your subscription details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="self-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center justify-center space-x-2">
                <Shield className="h-8 w-8" />
                <span>Upgrade Plan</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Choose the perfect plan for your business needs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Current Account Status */}
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Current Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center">Loading...</p>
              ) : subscribed && plan ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Plan</span>
                    <Badge className="bg-gradient-primary">
                      {PRICING_PLANS[plan].name}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Billing</span>
                    <span className="text-sm text-muted-foreground">
                      {billing_interval === 'year' ? 'Yearly' : billing_interval === 'month' ? 'Monthly' : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Paid On</span>
                    <span className="text-sm text-muted-foreground">
                      {current_period_start ? new Date(current_period_start).toLocaleDateString() : 'Not Available'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Next Renewal</span>
                    <span className="text-sm text-muted-foreground">
                      {subscription_end ? new Date(subscription_end).toLocaleDateString() : 'Not Available'}
                    </span>
                  </div>
                  
                  {price_amount && currency && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Price</span>
                      <span className="text-lg font-bold">
                        ${(price_amount / 100).toFixed(0)}/{billing_interval === 'year' ? 'year' : 'month'}
                      </span>
                    </div>
                  )}
                  
                  {discount_ever_redeemed && (
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 space-y-2">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Star className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">
                          10% Retention Discount Applied
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Original Price:</span>
                          <span className="line-through text-muted-foreground">${PRICING_PLANS[plan].price}/mo</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-green-600">Discounted Price:</span>
                          <span className="text-xl font-bold text-green-600">
                            ${(PRICING_PLANS[plan].price * 0.9).toFixed(2)}/mo
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-600">You save:</span>
                          <span className="font-semibold text-green-600">
                            ${(PRICING_PLANS[plan].price * 0.1).toFixed(2)}/mo
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 mt-2 border-t border-green-500/20">
                        <p className="text-xs text-center text-green-600">
                          Discount valid for 3 months from redemption
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!discount_ever_redeemed && (
                    <div className="space-y-2">
                      {discount && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Discount</span>
                          <span className="text-sm text-green-600">
                            {discount.percent_off ? `${discount.percent_off}% off` : `$${(discount.amount_off! / 100).toFixed(2)} off`}
                            {discount.duration === 'repeating' && discount.duration_in_months ? ` for ${discount.duration_in_months} months` : ''}
                          </span>
                        </div>
                      )}
                      
                      {billing_interval !== 'year' && (
                          <div className="space-y-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground text-right">
                            Annual total: ${price_amount ? ((price_amount / 100) * 12).toFixed(0) : (PRICING_PLANS[plan].price * 12)}
                          </div>
                          {(() => {
                            const currentMonthlyPaid = price_amount ? (price_amount / 100) : PRICING_PLANS[plan].price;
                            const yearlyPrice = PRICING_PLANS[plan].yearlyPrice;
                            const creditApplied = currentMonthlyPaid;
                            const amountDue = yearlyPrice - creditApplied;
                            
                            return (
                              <div className="space-y-2">
                                <div className="p-2 bg-primary/5 rounded-lg text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Yearly Price:</span>
                                    <span>${yearlyPrice}</span>
                                  </div>
                                  <div className="flex justify-between text-green-600">
                                    <span>Credit Applied:</span>
                                    <span>-${creditApplied}</span>
                                  </div>
                                  <div className="flex justify-between font-bold pt-1 border-t">
                                    <span>Amount Due:</span>
                                    <span>${amountDue}</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs"
                                  onClick={() => handleUpgrade(
                                    PRICING_PLANS[plan].yearly_price_id, 
                                    `${PRICING_PLANS[plan].name} (Yearly)`,
                                    amountDue * 100,
                                    true
                                  )}
                                >
                                  <Calendar className="h-3 w-3 mr-2" />
                                  Switch to Yearly & Pay ${amountDue}
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Save {plans.find(p => p.key === plan)?.savings}
                                  </Badge>
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                      onClick={openCustomerPortal}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Payment Methods
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowCancellationFlow(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </div>
                  {subscribed && subscription_end && (
                    <div className="space-y-3">
                      {is_trialing && !isYearly && plan && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                              <p className="font-medium mb-1">Trial Period Note</p>
                              <p>If you upgrade to a yearly plan now, your yearly subscription will start after your trial ends on {new Date(subscription_end).toLocaleDateString()}. You won't receive a new trial period.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {!isYearly && plan && (
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 bg-gradient-primary"
                            onClick={() => {
                              const currentMonthlyPaid = price_amount ? (price_amount / 100) : PRICING_PLANS[plan].price;
                              const yearlyPrice = PRICING_PLANS[plan].yearlyPrice;
                              const amountDue = yearlyPrice - currentMonthlyPaid;
                              handleUpgrade(
                                PRICING_PLANS[plan].yearly_price_id,
                                `${PRICING_PLANS[plan].name} (Yearly)`,
                                amountDue * 100,
                                true
                              );
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Upgrade to Yearly (Save {plans.find(p => p.key === plan)?.savings})
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : is_trialing ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plan</span>
                    <Badge variant="secondary">Professional (Trial)</Badge>
                  </div>
                  
                  {profile?.trial_start && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Trial Started</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(profile.trial_start).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {profile?.trial_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Trial Ends</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(profile.trial_end).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    You're on a 7-day free trial of the Professional plan
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plan</span>
                    <Badge variant="secondary">No Active Plan</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose a plan below to get started
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trial Add-on Usage Notice */}
        {is_trialing && (
          <div className="max-w-4xl mx-auto">
            <TrialAddonNotice trialEnd={trial_end || undefined} />
          </div>
        )}

        {/* Plan Comparison for subscribed non-trial users */}
        {subscribed && plan && !is_trialing && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Upgrade Benefits</h2>
              <p className="text-muted-foreground">
                {nextTier ? `Here's what you'll gain by upgrading to ${nextTier.name}` : 'You\'re on the highest tier!'}
              </p>
              
              {/* Monthly/Yearly Toggle */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={!isYearly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsYearly(false)}
                  className={!isYearly ? "bg-gradient-primary" : ""}
                >
                  Monthly
                </Button>
                <Button
                  variant={isYearly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsYearly(true)}
                  className={isYearly ? "bg-gradient-primary" : ""}
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Save up to $178
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
              {/* Current Plan */}
              {currentTierData && (
                <Card className="relative ring-2 ring-primary">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="default">Current Plan</Badge>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle>{currentTierData.name}</CardTitle>
                    <div className="space-y-2">
                      {isYearly ? (
                        <>
                          <div className="text-3xl font-bold">
                            ${(currentTierData.yearlyPrice / 12).toFixed(0)}
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Billed annually at ${currentTierData.yearlyPrice}/yr
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            Save {currentTierData.savings}/year
                          </div>
                        </>
                      ) : (
                        <div className="text-3xl font-bold">
                          ${currentTierData.price}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">Your current features</p>
                    <ul className="space-y-3">
                      {currentTierData.features.map((feature, index) => {
                        const isExcluded = feature.startsWith('❌');
                        const featureText = isExcluded ? feature.substring(2) : feature;
                        return (
                          <li key={index} className="flex items-start text-sm">
                            {isExcluded ? (
                              <X className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            )}
                            <span className={isExcluded ? "text-muted-foreground" : ""}>{featureText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Show upgrade options based on current plan */}
              {plan === 'starter' ? (
                <>
                  {/* Growing Plan for Starter users */}
                  {plans.find(p => p.key === 'growing') && (
                    <Card className="relative ring-2 ring-accent">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Upgrade Option
                        </Badge>
                      </div>
                      <CardHeader className="text-center">
                        <CardTitle>{plans.find(p => p.key === 'growing')?.name}</CardTitle>
                        <div className="space-y-2">
                          {isYearly ? (
                            <>
                              <div className="text-3xl font-bold">
                                ${(plans.find(p => p.key === 'growing')!.yearlyPrice / 12).toFixed(0)}
                                <span className="text-sm font-normal text-muted-foreground">/month</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Billed annually at ${plans.find(p => p.key === 'growing')?.yearlyPrice}/yr
                              </div>
                              <div className="text-sm text-green-600 font-medium">
                                Save {plans.find(p => p.key === 'growing')?.savings}/year
                              </div>
                            </>
                          ) : (
                            <div className="text-3xl font-bold">
                              ${plans.find(p => p.key === 'growing')?.price}
                              <span className="text-sm font-normal text-muted-foreground">/month</span>
                            </div>
                          )}
                        </div>
                        {isYearly && (
                          <Badge variant="secondary" className="text-xs mx-auto">
                            Save {plans.find(p => p.key === 'growing')?.savings}/year
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-green-600 font-medium text-center">Additional benefits:</p>
                        <ul className="space-y-3">
                          {plans.find(p => p.key === 'growing')?.features
                            .filter((feature: string) => !currentTierData?.features.some((cf: string) => cf === feature))
                            .map((feature, index) => (
                              <li key={index} className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="font-medium">{feature.startsWith('❌') ? feature.substring(2) : feature}</span>
                              </li>
                            ))}
                        </ul>
                        {(() => {
                          const currentMonthlyPaid = price_amount ? (price_amount / 100) : PRICING_PLANS.starter.price;
                          const growingPlan = plans.find(p => p.key === 'growing')!;
                          const newPlanPrice = isYearly ? growingPlan.yearlyPrice : growingPlan.price;
                          const proratedAmount = isYearly ? newPlanPrice : (newPlanPrice - currentMonthlyPaid);
                          
                          return (
                            <>
                              {!isYearly && subscribed && (
                                <div className="p-3 bg-primary/5 rounded-lg text-sm space-y-1 mb-3">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">New Plan Price:</span>
                                    <span className="font-semibold">${newPlanPrice}/month</span>
                                  </div>
                                  <div className="flex justify-between text-green-600">
                                    <span>Credit Applied:</span>
                                    <span>-${currentMonthlyPaid}</span>
                                  </div>
                                  <div className="flex justify-between font-bold pt-1 border-t">
                                    <span>Amount Due Now:</span>
                                    <span>${proratedAmount}</span>
                                  </div>
                                </div>
                              )}
                              {subscribed && !is_trialing && !isYearly && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-3">
                                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                    ⚠️ Your card on file will be charged immediately
                                  </p>
                                </div>
                              )}
                              <Button 
                                className="w-full bg-gradient-primary" 
                                onClick={() => handleUpgrade(
                                  getCurrentPriceId(growingPlan), 
                                  `${growingPlan.name}${isYearly ? ' (Yearly)' : ''}`,
                                  isYearly || !subscribed ? undefined : proratedAmount * 100,
                                  isYearly
                                )}
                                disabled={isLoading}
                              >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {subscribed && !isYearly ? `Pay $${proratedAmount} & Upgrade` : 'Upgrade to Growing'}
                              </Button>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Professional Plan for Starter users */}
                  {plans.find(p => p.key === 'professional') && (
                    <Card className="relative ring-2 ring-accent">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Upgrade Option
                        </Badge>
                      </div>
                      <CardHeader className="text-center">
                        <CardTitle>{plans.find(p => p.key === 'professional')?.name}</CardTitle>
                        <div className="space-y-2">
                          {isYearly ? (
                            <>
                              <div className="text-3xl font-bold">
                                ${(plans.find(p => p.key === 'professional')!.yearlyPrice / 12).toFixed(0)}
                                <span className="text-sm font-normal text-muted-foreground">/month</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Billed annually at ${plans.find(p => p.key === 'professional')?.yearlyPrice}/yr
                              </div>
                              <div className="text-sm text-green-600 font-medium">
                                Save {plans.find(p => p.key === 'professional')?.savings}/year
                              </div>
                            </>
                          ) : (
                            <div className="text-3xl font-bold">
                              ${plans.find(p => p.key === 'professional')?.price}
                              <span className="text-sm font-normal text-muted-foreground">/month</span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-green-600 font-medium text-center">Additional benefits:</p>
                        <ul className="space-y-3">
                          {plans.find(p => p.key === 'professional')?.features
                            .filter((feature: string) => !currentTierData?.features.some((cf: string) => cf === feature))
                            .map((feature, index) => (
                              <li key={index} className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="font-medium">{feature.startsWith('❌') ? feature.substring(2) : feature}</span>
                              </li>
                            ))}
                        </ul>
                        {(() => {
                          const currentMonthlyPaid = price_amount ? (price_amount / 100) : PRICING_PLANS.starter.price;
                          const professionalPlan = plans.find(p => p.key === 'professional')!;
                          const newPlanPrice = isYearly ? professionalPlan.yearlyPrice : professionalPlan.price;
                          const proratedAmount = isYearly ? newPlanPrice : (newPlanPrice - currentMonthlyPaid);
                          
                          return (
                            <>
                              {!isYearly && subscribed && (
                                <div className="p-3 bg-primary/5 rounded-lg text-sm space-y-1 mb-3">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">New Plan Price:</span>
                                    <span className="font-semibold">${newPlanPrice}/month</span>
                                  </div>
                                  <div className="flex justify-between text-green-600">
                                    <span>Credit Applied:</span>
                                    <span>-${currentMonthlyPaid}</span>
                                  </div>
                                  <div className="flex justify-between font-bold pt-1 border-t">
                                    <span>Amount Due Now:</span>
                                    <span>${proratedAmount}</span>
                                  </div>
                                </div>
                              )}
                              {subscribed && !is_trialing && !isYearly && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-3">
                                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                    ⚠️ Your card on file will be charged immediately
                                  </p>
                                </div>
                              )}
                              <Button 
                                className="w-full bg-gradient-primary" 
                                onClick={() => handleUpgrade(
                                  getCurrentPriceId(professionalPlan),
                                  `${professionalPlan.name}${isYearly ? ' (Yearly)' : ''}`,
                                  isYearly || !subscribed ? undefined : proratedAmount * 100,
                                  isYearly
                                )}
                                disabled={isLoading}
                              >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {subscribed && !isYearly ? `Pay $${proratedAmount} & Upgrade` : 'Upgrade to Professional'}
                              </Button>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : nextTier && currentTierData ? (
                <Card className="relative ring-2 ring-accent">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Additional Benefits
                    </Badge>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle>{nextTier.name}</CardTitle>
                    <div className="space-y-2">
                      {isYearly ? (
                        <>
                          <div className="text-3xl font-bold">
                            ${(nextTier.yearlyPrice / 12).toFixed(0)}
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Billed annually at ${nextTier.yearlyPrice}/yr
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            Save {nextTier.savings}/year
                          </div>
                        </>
                      ) : (
                        <div className="text-3xl font-bold">
                          ${nextTier.price}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-green-600 font-medium text-center">You'll gain these benefits:</p>
                    <ul className="space-y-3">
                      {nextTier.features
                        .filter((feature: string) => !currentTierData.features.some((cf: string) => cf === feature))
                        .map((feature, index) => {
                          const isExcluded = feature.startsWith('❌');
                          const featureText = isExcluded ? feature.substring(2) : feature;
                          return (
                            <li key={index} className="flex items-start text-sm">
                              <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="font-medium">{featureText}</span>
                            </li>
                          );
                        })}
                    </ul>
                    {(() => {
                      const currentMonthlyPaid = price_amount ? (price_amount / 100) : (plan === 'growing' ? PRICING_PLANS.growing.price : PRICING_PLANS.professional.price);
                      const newPlanPrice = isYearly ? nextTier.yearlyPrice : nextTier.price;
                      const proratedAmount = isYearly ? newPlanPrice : (newPlanPrice - currentMonthlyPaid);
                      
                      return (
                        <>
                          {!isYearly && subscribed && (
                            <div className="p-3 bg-primary/5 rounded-lg text-sm space-y-1 mb-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">New Plan Price:</span>
                                <span className="font-semibold">${newPlanPrice}/month</span>
                              </div>
                              <div className="flex justify-between text-green-600">
                                <span>Credit Applied:</span>
                                <span>-${currentMonthlyPaid}</span>
                              </div>
                              <div className="flex justify-between font-bold pt-1 border-t">
                                <span>Amount Due Now:</span>
                                <span>${proratedAmount}</span>
                              </div>
                            </div>
                          )}
                          {subscribed && !is_trialing && !isYearly && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-3">
                              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                ⚠️ Your card on file will be charged immediately
                              </p>
                            </div>
                          )}
                          <Button 
                            className="w-full bg-gradient-primary" 
                            onClick={() => handleUpgrade(
                              getCurrentPriceId(nextTier),
                              `${nextTier.name}${isYearly ? ' (Yearly)' : ''}`,
                              isYearly || !subscribed ? undefined : proratedAmount * 100,
                              isYearly
                            )}
                            disabled={isLoading}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {subscribed && !isYearly ? `Pay $${proratedAmount} & Upgrade` : `Upgrade to ${nextTier.name}`}
                          </Button>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card className="relative">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Maximum Features Unlocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      You're enjoying all the benefits of our highest tier plan!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Billing Toggle */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">Switch to {isYearly ? 'Monthly' : 'Yearly'} Billing</h3>
                    <p className="text-sm text-muted-foreground">
                      {isYearly 
                        ? 'Switch to monthly billing for more flexibility' 
                        : `Save ${currentTierData?.savings || '$58'} per year with annual billing`
                      }
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsYearly(!isYearly)}
                  >
                    {isYearly ? 'Switch to Monthly' : 'Switch to Yearly'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Downgrade Option */}
            {currentPlanLevel > 1 && (
              <Card className="max-w-2xl mx-auto border-destructive/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Need to Downgrade?</h3>
                      <p className="text-sm text-muted-foreground">
                        Switch to a lower tier plan if your needs have changed
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={openCustomerPortal}
                    >
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Manage Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Plans for non-subscribed or trial users */}
        {(!subscribed || is_trialing) && (
          <div>
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-center gap-4">
                  <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
                        isYearly ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
                  Yearly <Badge variant="secondary" className="ml-1">Save 2 months</Badge>
                </span>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                  7-day free trial • Credit card required • Cancel anytime
                </Badge>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
                {plans.map((planItem) => (
                  <Card 
                    key={planItem.name} 
                    className={`relative ${planItem.popular ? 'ring-2 ring-accent' : ''}`}
                  >
                    {planItem.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle>{planItem.name}</CardTitle>
                      <div className="space-y-2">
                        {isYearly ? (
                          <>
                            <div className="text-3xl font-bold">
                              ${(planItem.yearlyPrice / 12).toFixed(0)}
                              <span className="text-sm font-normal text-muted-foreground">/month</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Billed annually at ${planItem.yearlyPrice}/yr
                            </div>
                            <div className="text-sm text-green-600 font-medium">
                              Save {planItem.savings}/year
                            </div>
                          </>
                        ) : (
                          <div className="text-3xl font-bold">
                            ${planItem.price}
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <ul className="space-y-2">
                        {planItem.features.map((feature, index) => {
                          const isExcluded = feature.startsWith('❌');
                          const featureText = isExcluded ? feature.substring(2) : feature;
                          return (
                            <li key={index} className="flex items-start text-sm">
                              {isExcluded ? (
                                <X className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                              )}
                              <span className={isExcluded ? "text-muted-foreground" : ""}>{featureText}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="text-center pt-4">
                        <p className="text-sm text-muted-foreground">
                          Plan will be automatically selected based on your revenue when trial ends
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Enterprise Section */}
        {(!subscribed || is_trialing) && (
          <div className="mt-12">
            <div className="text-center mb-8 space-y-4">
              <h2 className="text-3xl font-bold">Enterprise Plan</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Custom pricing based on your monthly revenue. Select your revenue tier below to see pricing.
              </p>
            </div>
            
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Select Your Revenue Tier</CardTitle>
                <CardDescription className="text-center">
                  Choose the tier that matches your monthly revenue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <Select 
                    value={selectedEnterpriseTier} 
                    onValueChange={(value) => setSelectedEnterpriseTier(value as keyof typeof ENTERPRISE_TIERS)}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier1">$200k - $500k monthly revenue</SelectItem>
                      <SelectItem value="tier2">$500k - $1M monthly revenue</SelectItem>
                      <SelectItem value="tier3">$1M+ monthly revenue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center">
                  <div className="inline-block p-6 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20">
                    <div className="text-5xl font-bold mb-2">
                      ${ENTERPRISE_TIERS[selectedEnterpriseTier].price}
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ENTERPRISE_TIERS[selectedEnterpriseTier].revenue}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Included Features</h3>
                    <ul className="space-y-2">
                      {ENTERPRISE_TIERS[selectedEnterpriseTier].features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Perfect For</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span>Large e-commerce businesses</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span>Teams needing advanced support</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span>Businesses with complex workflows</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Enterprise plan will be automatically selected based on your revenue when trial ends
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add-ons Cart Section */}
        <Card className="mt-6 max-w-6xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Add-ons
                  </span>
                  {totalItems > 0 && (
                    <Badge variant="secondary" className="text-base">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'} • ${cartTotal}/month
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Select the quantity for each add-on you need (starts at 0)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {addons.map((addon) => (
                  <div 
                    key={addon.key}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                      addonQuantities[addon.key] > 0 ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-semibold">{addon.name}</h4>
                          <p className="text-sm text-muted-foreground">{addon.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold">${addon.price}/month</span>
                            <span className="text-xs text-orange-600">Billed immediately</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setAddonQuantities(prev => ({ 
                            ...prev, 
                            [addon.key]: Math.max(0, prev[addon.key] - 1) 
                          }))}
                          disabled={addonQuantities[addon.key] <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xl font-bold w-12 text-center">
                          {addonQuantities[addon.key]}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setAddonQuantities(prev => ({ 
                            ...prev, 
                            [addon.key]: prev[addon.key] + 1 
                          }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {addonQuantities[addon.key] > 0 && (
                        <div className="font-bold text-lg min-w-[100px] text-right">
                          ${addon.price * addonQuantities[addon.key]}/mo
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {totalItems > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Monthly Total</p>
                        <p className="text-3xl font-bold">${cartTotal}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAddonQuantities({
                            bank_account: 0,
                            amazon_account: 0,
                            user: 0
                          })}
                        >
                          Reset
                        </Button>
                        <Button
                          size="lg"
                          onClick={handleCheckoutAddons}
                          disabled={isLoading}
                          className="bg-gradient-primary"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Checkout Now
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                {totalItems === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select add-ons above to get started</p>
                  </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="mt-6 max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Need help choosing?</CardTitle>
              <CardDescription className="text-center">
                Not sure which plan is right for you? Our team can help you find the perfect fit for your business needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline">Contact Sales</Button>
            </CardContent>
        </Card>
      </div>

      {/* Upgrade Confirmation Dialog */}
      <UpgradeConfirmDialog
        open={!!pendingUpgrade}
        onOpenChange={(open) => !open && setPendingUpgrade(null)}
        onConfirm={confirmUpgrade}
        planName={pendingUpgrade?.planName || ''}
        amount={pendingUpgrade?.amount || 0}
        isYearly={pendingUpgrade?.isYearly || false}
      />

      {/* Cancellation Flow Modal */}
      <CancellationFlow 
        open={showCancellationFlow} 
        onOpenChange={setShowCancellationFlow} 
      />
    </div>
  );
};

export default UpgradePlan;