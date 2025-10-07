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
  const [recommendedPlan, setRecommendedPlan] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_revenue')
        .eq('user_id', user.id)
        .single();

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

        // Determine appropriate plan based on revenue
        if (revenueNum <= 20000) {
          setRecommendedPlan({ type: 'standard', plan: PRICING_PLANS.starter });
        } else if (revenueNum <= 100000) {
          setRecommendedPlan({ type: 'standard', plan: PRICING_PLANS.growing });
        } else if (revenueNum <= 200000) {
          setRecommendedPlan({ type: 'standard', plan: PRICING_PLANS.professional });
        } else if (revenueNum <= 500000) {
          setRecommendedPlan({ type: 'enterprise', plan: ENTERPRISE_TIERS.tier1 });
        } else if (revenueNum <= 1000000) {
          setRecommendedPlan({ type: 'enterprise', plan: ENTERPRISE_TIERS.tier2 });
        } else {
          setRecommendedPlan({ type: 'enterprise', plan: ENTERPRISE_TIERS.tier3 });
        }
      } else {
        // Default to Growing plan if no revenue info
        setRecommendedPlan({ type: 'standard', plan: PRICING_PLANS.growing });
      }
    };

    fetchUserProfile();
  }, []);

  const handlePayNow = () => {
    navigate('/upgrade-plan');
  };

  if (!recommendedPlan) return null;

  const plan = recommendedPlan.plan;

  return (
    <Dialog open={open} modal>
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
          <div className="border rounded-lg p-6 space-y-4 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                {userRevenue && (
                  <Badge variant="secondary" className="mt-2">
                    Recommended for {userRevenue} revenue
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">${plan.price}</div>
                <div className="text-sm text-muted-foreground">/month</div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <p className="font-semibold text-sm">Included features:</p>
              <ul className="space-y-2">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={handlePayNow}
              className="w-full bg-gradient-primary h-12 text-base font-semibold mt-6"
              size="lg"
            >
              Pay Now - ${plan.price}/month
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Need a different plan? You can choose another option on the next page.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
