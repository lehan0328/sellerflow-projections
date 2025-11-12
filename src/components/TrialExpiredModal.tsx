import { useEffect, useState } from "react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, ENTERPRISE_TIERS } from "@/hooks/useSubscription";
import { AlertCircle, Check, X, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAmazonRevenue } from "@/hooks/useAmazonRevenue";

export const TrialExpiredModal = ({ open }: { open: boolean }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRevenue, setUserRevenue] = useState<string | null>(null);
  const [recommendedPlan, setRecommendedPlan] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasReferredDiscount, setHasReferredDiscount] = useState(false);
  
  // Use unified Amazon revenue hook
  const { last30DaysNetPayouts: currentRevenue, isLoading: revenueLoading } = useAmazonRevenue();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSubscribe = async (priceId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_revenue, plan_override, discount_redeemed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if user has referred discount available
      const hasDiscount = profile?.plan_override === 'referred_user_discount' && !profile?.discount_redeemed_at;
      setHasReferredDiscount(hasDiscount);
    };

    fetchUserProfile();
  }, []);

  // Determine recommended plan based on revenue from hook
  useEffect(() => {
    if (revenueLoading || currentRevenue === undefined) return;

    let recommendedPlanData = null;
    let higherPlans: any[] = [];

    // Use Amazon revenue from hook to determine plan
    const revenueNum = currentRevenue;

      // Determine appropriate plan based on revenue and get higher plans
      if (revenueNum <= 10000) {
        recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.starter };
        higherPlans = [
          { type: 'standard', plan: PRICING_PLANS.growing },
          { type: 'standard', plan: PRICING_PLANS.professional },
        ];
      } else if (revenueNum <= 50000) {
        recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.growing };
        higherPlans = [
          { type: 'standard', plan: PRICING_PLANS.professional },
        ];
      } else if (revenueNum <= 100000) {
        recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.professional };
        higherPlans = [];
      } else if (revenueNum <= 250000) {
        recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier1 };
        higherPlans = [
          { type: 'enterprise', plan: ENTERPRISE_TIERS.tier2 },
        ];
      } else if (revenueNum <= 500000) {
        recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier2 };
        higherPlans = [
          { type: 'enterprise', plan: ENTERPRISE_TIERS.tier3 },
        ];
      } else {
        recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier3 };
        higherPlans = [];
      }

    setRecommendedPlan(recommendedPlanData);
    setAvailablePlans([recommendedPlanData, ...higherPlans]);
    setSelectedPlanId(recommendedPlanData.plan.priceId || recommendedPlanData.plan.price_id);
  }, [currentRevenue, revenueLoading]);

  if (!recommendedPlan || availablePlans.length === 0) return null;

  // Define complete feature lists for each plan with included flag
  const planFeatures = {
    starter: [
      { text: "Up to $10k monthly Amazon payout", included: true },
      { text: "2 bank/credit card connections", included: true },
      { text: "1 Amazon connection", included: true },
      { text: "Advance forecasting workflow", included: true },
      { text: "365 day cashflow projection", included: true },
      { text: "Bank transaction matching", included: true },
      { text: "Email support", included: true },
      { text: "Additional users", included: false },
      { text: "AI insights", included: false },
      { text: "AI PDF extractor", included: false },
      { text: "Automated notifications", included: false },
      { text: "Scenario planning", included: false },
    ],
    growing: [
      { text: "Up to $50k monthly Amazon payout", included: true },
      { text: "3 bank/credit card connections", included: true },
      { text: "1 Amazon connection", included: true },
      { text: "AI insights", included: true },
      { text: "AI PDF extractor", included: true },
      { text: "AI PO autofill", included: true },
      { text: "2 additional users", included: true },
      { text: "Advance forecasting workflow", included: true },
      { text: "365 day cashflow projection", included: true },
      { text: "Bank transaction matching", included: true },
      { text: "Basic analytics", included: true },
      { text: "Priority support", included: true },
      { text: "Automated notifications", included: false },
      { text: "Scenario planning", included: false },
    ],
    professional: [
      { text: "Up to $100k monthly Amazon payout", included: true },
      { text: "4 bank/credit card connections", included: true },
      { text: "1 Amazon connection", included: true },
      { text: "AI insights", included: true },
      { text: "AI PDF extractor", included: true },
      { text: "AI PO autofill", included: true },
      { text: "5 additional users", included: true },
      { text: "Automated notification", included: true },
      { text: "Advance forecasting workflow", included: true },
      { text: "365 day cashflow projection", included: true },
      { text: "Bank transaction matching", included: true },
      { text: "Scenario planning", included: true },
      { text: "Priority support", included: true },
    ],
    enterprise_tier1: [
      { text: "$100k - $250k monthly Amazon payout", included: true },
      { text: "5 bank/credit card connections", included: true },
      { text: "2 Amazon connections", included: true },
      { text: "7 additional users", included: true },
      { text: "All Professional features", included: true },
      { text: "1:1 hands-on setup", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    enterprise_tier2: [
      { text: "$250k - $500k monthly Amazon payout", included: true },
      { text: "5 bank/credit card connections", included: true },
      { text: "2 Amazon connections", included: true },
      { text: "7 additional users", included: true },
      { text: "All Professional features", included: true },
      { text: "1:1 hands-on setup", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    enterprise_tier3: [
      { text: "$500k+ monthly Amazon payout", included: true },
      { text: "5 bank/credit card connections", included: true },
      { text: "2 Amazon connections", included: true },
      { text: "7 additional users", included: true },
      { text: "All Professional features", included: true },
      { text: "1:1 hands-on setup", included: true },
      { text: "Dedicated account manager", included: true },
    ]
  };

  // Get features for the displayed plans
  const plansToDisplay = availablePlans.slice(0, 3).map((planData, index) => {
    const plan = planData.plan;
    const isRecommended = index === 0;
    const isEnterprise = planData.type === 'enterprise';
    let features: Array<{ text: string; included: boolean }> = [];

    // Match features based on plan name
    if (plan.name === "Starter") {
      features = planFeatures.starter;
    } else if (plan.name === "Growing") {
      features = planFeatures.growing;
    } else if (plan.name === "Professional") {
      features = planFeatures.professional;
    } else if (plan.name === "Enterprise - Tier 1") {
      features = planFeatures.enterprise_tier1;
    } else if (plan.name === "Enterprise - Tier 2") {
      features = planFeatures.enterprise_tier2;
    } else if (plan.name === "Enterprise - Tier 3") {
      features = planFeatures.enterprise_tier3;
    }

    // Handle both naming conventions (priceId vs price_id)
    const priceId = isEnterprise 
      ? (isYearly ? plan.yearlyPriceId : plan.priceId)
      : (isYearly ? plan.yearly_price_id : plan.price_id);

    return {
      name: plan.name,
      price: isYearly ? (plan.yearlyPrice || plan.yearlyPrice) : plan.price,
      monthlyPrice: plan.price,
      yearlyPrice: plan.yearlyPrice || plan.yearlyPrice,
      priceId: priceId,
      isRecommended,
      features
    };
  });

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[1000px] max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
        >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle>Your Trial Has Ended</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          <DialogDescription>
            Your free trial has expired. Continue with the plan that fits your business.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Referral Discount Notice */}
          {hasReferredDiscount && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-3">
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30 shrink-0">
                  🎉 Referral Discount
                </Badge>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    You have a 10% discount waiting!
                  </p>
                  <div className="text-xs text-green-800 dark:text-green-200 space-y-1">
                    <p className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      <strong>Monthly plans:</strong> 10% off for 6 months
                    </p>
                    <p className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      <strong>Yearly plans:</strong> 10% off total price (on top of the 17% yearly savings!)
                    </p>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 italic">
                    Discount will be applied automatically at checkout
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border p-1 bg-muted/50">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  !isYearly 
                    ? 'bg-background shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  isYearly 
                    ? 'bg-background shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs text-primary font-semibold">Free 2 months</span>
              </button>
            </div>
          </div>

          {/* Current Revenue Display */}
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
            <div className="text-xs text-muted-foreground mb-1">Your Amazon Payout (Last 30 Days)</div>
            <div className="text-xl font-bold">
              ${currentRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">After Amazon fees</div>
          </div>

          {/* Display all three plans */}
          <div className="grid grid-cols-3 gap-4">
            {plansToDisplay.map((plan) => (
              <div
                key={plan.priceId}
                className={`border rounded-lg p-4 space-y-3 ${
                  plan.isRecommended
                    ? 'bg-primary/5 border-primary shadow-lg'
                    : 'bg-card border-border'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.isRecommended && (
                      <Badge variant="default" className="text-xs">Recommended</Badge>
                    )}
                  </div>
                  <div className="mb-3">
                    {isYearly ? (
                      <>
                        <div className="text-2xl font-bold">${(plan.price / 12).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">/month</div>
                        <div className="text-xs text-muted-foreground mt-1">${plan.price} billed annually</div>
                        <div className="text-xs text-muted-foreground line-through mt-1">
                          ${plan.monthlyPrice * 12} if billed monthly
                        </div>
                        <div className="text-xs font-semibold text-primary mt-1">
                          Save ${(plan.monthlyPrice * 12) - plan.price}/year
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">${plan.price}</div>
                        <div className="text-xs text-muted-foreground">/month</div>
                        <div className="text-xs text-primary mt-1">
                          💡 Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice}/year with yearly billing
                        </div>
                      </>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleSubscribe(plan.priceId)}
                    disabled={isLoading}
                    className={`w-full h-10 text-xs font-semibold mb-3 ${
                      plan.isRecommended ? 'bg-gradient-primary' : ''
                    }`}
                    variant={plan.isRecommended ? 'default' : 'outline'}
                    size="lg"
                  >
                    {isLoading ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <ul className="space-y-1.5">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-xs leading-relaxed ${!feature.included && 'text-muted-foreground/60'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            All plans include secure payment processing and can be cancelled anytime
          </p>
        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
