import { useEffect, useState } from "react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, ENTERPRISE_TIERS } from "@/hooks/useSubscription";
import { AlertCircle, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const TrialExpiredModal = ({ open }: { open: boolean }) => {
  const navigate = useNavigate();
  const [userRevenue, setUserRevenue] = useState<string | null>(null);
  const [currentRevenue, setCurrentRevenue] = useState<number>(0);
  const [recommendedPlan, setRecommendedPlan] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_revenue')
        .eq('user_id', user.id)
        .single();

      // Fetch actual Amazon revenue (placeholder for now)
      // TODO: Replace with actual Amazon revenue when integration is set up
      const placeholderRevenue = 45000; // $45k placeholder
      setCurrentRevenue(placeholderRevenue);

      let recommendedPlanData = null;
      let higherPlans: any[] = [];

      if (profile?.monthly_revenue) {
        setUserRevenue(profile.monthly_revenue);
        
        // Parse revenue amount to determine plan
        const revenueStr = profile.monthly_revenue.toLowerCase().replace(/[^0-9kmi]/g, '');
        let revenueNum = 0;
        
        if (revenueStr.includes('k')) {
          revenueNum = parseFloat(revenueStr) * 1000;
        } else if (revenueStr.includes('m')) {
          revenueNum = parseFloat(revenueStr) * 1000000;
        } else {
          revenueNum = parseFloat(revenueStr);
        }

        // Determine appropriate plan based on revenue and get higher plans
        if (revenueNum <= 20000) {
          recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.starter };
          higherPlans = [
            { type: 'standard', plan: PRICING_PLANS.growing },
          ];
        } else if (revenueNum <= 100000) {
          recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.growing };
          higherPlans = [
            { type: 'standard', plan: PRICING_PLANS.professional },
          ];
        } else if (revenueNum <= 200000) {
          recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.professional };
          higherPlans = []; // No upgrade for Professional
        } else if (revenueNum <= 500000) {
          recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier1 };
          higherPlans = [
            { type: 'enterprise', plan: ENTERPRISE_TIERS.tier2 },
          ];
        } else if (revenueNum <= 1000000) {
          recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier2 };
          higherPlans = [
            { type: 'enterprise', plan: ENTERPRISE_TIERS.tier3 },
          ];
        } else {
          recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier3 };
          higherPlans = [];
        }
      } else {
        // Default to Growing plan if no revenue info
        recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.growing };
        higherPlans = [
          { type: 'standard', plan: PRICING_PLANS.professional },
        ];
      }

      setRecommendedPlan(recommendedPlanData);
      setAvailablePlans([recommendedPlanData, ...higherPlans]);
      setSelectedPlanId(recommendedPlanData.plan.priceId);
    };

    fetchUserProfile();
  }, []);

  if (!recommendedPlan || availablePlans.length === 0) return null;

  // Define complete feature lists for each plan with included flag
  const planFeatures = {
    starter: [
      { text: "Up to $20k monthly Amazon payout", included: true },
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
      { text: "4 bank/credit card connections", included: true },
      { text: "1 Amazon connection", included: true },
      { text: "AI insights", included: true },
      { text: "AI PDF extractor", included: true },
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
      { text: "Up to $200k monthly Amazon payout", included: true },
      { text: "7 bank/credit card connections", included: true },
      { text: "1 Amazon connection", included: true },
      { text: "AI insights", included: true },
      { text: "AI PDF extractor", included: true },
      { text: "5 additional users", included: true },
      { text: "Automated notification", included: true },
      { text: "Advance forecasting workflow", included: true },
      { text: "365 day cashflow projection", included: true },
      { text: "Bank transaction matching", included: true },
      { text: "Scenario planning", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Priority support", included: true },
    ]
  };

  // Get features for the displayed plans
  const plansToDisplay = availablePlans.slice(0, 2).map((planData, index) => {
    const plan = planData.plan;
    const isRecommended = index === 0;
    let features: Array<{ text: string; included: boolean }> = [];

    // Match features based on plan name
    if (plan.name === "Starter") {
      features = planFeatures.starter;
    } else if (plan.name === "Growing") {
      features = planFeatures.growing;
    } else if (plan.name === "Professional") {
      features = planFeatures.professional;
    }

    return {
      name: plan.name,
      price: isYearly ? plan.yearlyPrice : plan.price,
      monthlyPrice: plan.price,
      yearlyPrice: plan.yearlyPrice,
      priceId: isYearly ? plan.yearly_price_id : plan.price_id,
      isRecommended,
      features
    };
  });

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[700px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
        >
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Your Trial Has Ended</DialogTitle>
          </div>
          <DialogDescription>
            Your free trial has expired. Continue with the plan that fits your business.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
                <span className="ml-2 text-xs text-primary font-semibold">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Current Revenue Display */}
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
            <div className="text-xs text-muted-foreground mb-1">Your Current Monthly Revenue</div>
            <div className="text-xl font-bold">
              ${currentRevenue.toLocaleString()}
            </div>
          </div>

          {/* Display only recommended plan and one upsell plan */}
          <div className="grid grid-cols-2 gap-4">
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
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `/upgrade-plan?priceId=${plan.priceId}`;
                    }}
                    className={`w-full h-10 text-xs font-semibold mb-3 ${
                      plan.isRecommended ? 'bg-gradient-primary' : ''
                    }`}
                    variant={plan.isRecommended ? 'default' : 'outline'}
                    size="lg"
                  >
                    Subscribe Now
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
