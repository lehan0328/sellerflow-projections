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

  // Define complete feature lists for each plan
  const planFeatures = {
    starter: [
      "Up to $20k monthly Amazon payout",
      "2 bank/credit card connections",
      "1 Amazon connection",
      "Advance forecasting workflow",
      "365 day cashflow projection",
      "Bank transaction matching",
      "Email support"
    ],
    growing: [
      "Up to $50k monthly Amazon payout",
      "4 bank/credit card connections",
      "1 Amazon connection",
      "AI insights",
      "AI PDF extractor",
      "2 additional users",
      "Advance forecasting workflow",
      "365 day cashflow projection",
      "Bank transaction matching",
      "Basic analytics",
      "Priority support"
    ],
    professional: [
      "Up to $200k monthly Amazon payout",
      "7 bank/credit card connections",
      "1 Amazon connection",
      "AI insights",
      "AI PDF extractor",
      "5 additional users",
      "Automated notification",
      "Advance forecasting workflow",
      "365 day cashflow projection",
      "Bank transaction matching",
      "Scenario planning",
      "Advanced analytics",
      "Priority support"
    ]
  };

  // Get features for the displayed plans
  const plansToDisplay = availablePlans.slice(0, 2).map((planData, index) => {
    const plan = planData.plan;
    const isRecommended = index === 0;
    let features: string[] = [];

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
      price: plan.price,
      priceId: plan.price_id,
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
                    <div className="text-2xl font-bold">${plan.price}</div>
                    <div className="text-xs text-muted-foreground">/month</div>
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
                    Start Trial
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <ul className="space-y-1.5">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-xs leading-relaxed">
                          {feature}
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
