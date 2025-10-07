import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, ENTERPRISE_TIERS } from "@/hooks/useSubscription";
import { AlertCircle, Check } from "lucide-react";
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
            { type: 'standard', plan: PRICING_PLANS.professional },
          ];
        } else if (revenueNum <= 100000) {
          recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.growing };
          higherPlans = [
            { type: 'standard', plan: PRICING_PLANS.professional },
          ];
        } else if (revenueNum <= 200000) {
          recommendedPlanData = { type: 'standard', plan: PRICING_PLANS.professional };
          higherPlans = [];
        } else if (revenueNum <= 500000) {
          recommendedPlanData = { type: 'enterprise', plan: ENTERPRISE_TIERS.tier1 };
          higherPlans = [
            { type: 'enterprise', plan: ENTERPRISE_TIERS.tier2 },
            { type: 'enterprise', plan: ENTERPRISE_TIERS.tier3 },
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]" hideClose>
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
          {/* Available Plans */}
          <div className="space-y-4">
            {availablePlans.map((planData, index) => {
              const plan = planData.plan;
              const isRecommended = index === 0;
              const isSelected = selectedPlanId === plan.priceId;
              
              return (
                <div
                  key={plan.priceId}
                  className={`border rounded-lg p-6 space-y-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary shadow-lg'
                      : 'bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlanId(plan.priceId)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                        {isRecommended && (
                          <Badge variant="default">Recommended</Badge>
                        )}
                      </div>
                      {isRecommended && userRevenue && (
                        <Badge variant="secondary" className="mt-2">
                          For {userRevenue} revenue
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">${plan.price}</div>
                      <div className="text-sm text-muted-foreground">/month</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <p className="font-semibold text-sm">
                      {isRecommended ? 'Included features:' : 'Additional features:'}
                    </p>
                    <ul className="space-y-2">
                      {plan.features.map((feature: string, featureIndex: number) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <Button 
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/upgrade-plan?priceId=${selectedPlanId}`;
            }}
            className="w-full bg-gradient-primary h-12 text-base font-semibold mt-6"
            size="lg"
          >
            Pay Now - ${availablePlans.find(p => p.plan.priceId === selectedPlanId)?.plan.price}/month
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
