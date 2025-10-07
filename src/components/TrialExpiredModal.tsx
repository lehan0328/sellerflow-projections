import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  // Get all unique features across all plans for comparison
  const allFeatures = Array.from(
    new Set(availablePlans.flatMap(p => p.plan.features))
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[900px]" hideClose>
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Your Trial Has Ended</DialogTitle>
          </div>
          <DialogDescription>
            Your free trial has expired. Continue with the plan that fits your business.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Current Revenue Display */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
            <div className="text-sm text-muted-foreground mb-1">Your Current Monthly Revenue</div>
            <div className="text-2xl font-bold">
              ${currentRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {currentRevenue === 45000 ? 'Amazon integration pending - showing estimated revenue' : 'Based on Amazon sales data'}
            </div>
          </div>

          {/* Available Plans - Side by Side with Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {availablePlans.map((planData, index) => {
              const plan = planData.plan;
              const isRecommended = index === 0;
              const isSelected = selectedPlanId === plan.priceId;
              
              return (
                <div
                  key={plan.priceId}
                  className={`border rounded-lg p-6 space-y-4 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary shadow-lg'
                      : 'bg-gradient-to-br from-primary/5 to-accent/5 border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {isRecommended && (
                        <Badge variant="default" className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    {isRecommended && userRevenue && (
                      <Badge variant="secondary" className="text-xs mb-3">
                        For {userRevenue} revenue
                      </Badge>
                    )}
                    <div className="mt-3 mb-4">
                      <div className="text-3xl font-bold">${plan.price}</div>
                      <div className="text-sm text-muted-foreground">/month</div>
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/upgrade-plan?priceId=${plan.priceId}`;
                      }}
                      className="w-full bg-gradient-primary h-11 text-sm font-semibold mb-4"
                      size="lg"
                    >
                      Pay Now - ${plan.price}/mo
                    </Button>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <p className="font-semibold text-xs uppercase text-muted-foreground mb-3">Features</p>
                    <ul className="space-y-2.5">
                      {allFeatures.map((feature: string, featureIndex: number) => {
                        const hasFeature = plan.features.includes(feature);
                        return (
                          <li key={featureIndex} className="flex items-start gap-2">
                            {hasFeature ? (
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                            )}
                            <span className={`text-xs leading-relaxed ${!hasFeature && 'text-muted-foreground/60 line-through'}`}>
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            All plans include secure payment processing and can be cancelled anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
