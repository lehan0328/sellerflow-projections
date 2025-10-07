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

  // Define feature comparison data
  const featureRows = [
    { name: 'Bank/Credit Card Connections', values: { starter: '2', growing: '3', professional: '4' } },
    { name: 'Amazon Connections', values: { starter: '1', growing: '1', professional: '1' } },
    { name: 'Additional Users', values: { starter: false, growing: '2', professional: '5' } },
    { name: 'Advanced Forecasting Workflow', values: { starter: true, growing: true, professional: true } },
    { name: '365-Day Cash Flow Projection', values: { starter: true, growing: true, professional: true } },
    { name: 'Bank Transaction Matching', values: { starter: true, growing: true, professional: true } },
    { name: '✨ AI Insights', values: { starter: false, growing: true, professional: true } },
    { name: '✨ AI PDF Extractor', values: { starter: false, growing: true, professional: true } },
    { name: 'Automated Notifications', values: { starter: false, growing: false, professional: true } },
    { name: 'Scenario Planning', values: { starter: false, growing: false, professional: true } },
    { name: 'Analytics', values: { starter: false, growing: 'Basic', professional: 'Advanced' } },
  ];

  const getPlanKey = (planName: string) => {
    if (planName.includes('Starter')) return 'starter';
    if (planName.includes('Growing')) return 'growing';
    if (planName.includes('Professional')) return 'professional';
    return 'growing';
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto" hideClose>
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

          {/* Pricing Header Row */}
          <div className="grid grid-cols-3 gap-4 mb-0">
            {availablePlans.map((planData, index) => {
              const plan = planData.plan;
              const isRecommended = index === 0;
              const planKey = getPlanKey(plan.name);
              
              // Get revenue range based on plan
              let revenueRange = '';
              if (planKey === 'starter') revenueRange = 'Up to $20k monthly revenue';
              else if (planKey === 'growing') revenueRange = 'Up to $100k monthly revenue';
              else if (planKey === 'professional') revenueRange = 'Up to $200k monthly revenue';
              
              return (
                <div
                  key={plan.priceId}
                  className={`border rounded-t-lg p-6 text-center ${
                    isRecommended 
                      ? 'bg-primary/5 border-primary' 
                      : 'bg-background border-border'
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-3">{revenueRange}</p>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `/upgrade-plan?priceId=${plan.priceId}`;
                    }}
                    className={`w-full h-11 font-semibold mb-3 ${
                      isRecommended 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-background hover:bg-accent border border-input'
                    }`}
                    variant={isRecommended ? 'default' : 'outline'}
                  >
                    Start Trial
                  </Button>
                  <p className="text-xs text-muted-foreground">No credit card required</p>
                </div>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="border border-t-0 rounded-b-lg overflow-hidden">
            {featureRows.map((feature, index) => (
              <div 
                key={index}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr] ${
                  index % 2 === 0 ? 'bg-muted/30' : 'bg-background'
                }`}
              >
                <div className="p-4 font-medium text-sm border-r">
                  {feature.name}
                </div>
                {availablePlans.map((planData) => {
                  const planKey = getPlanKey(planData.plan.name);
                  const value = feature.values[planKey as keyof typeof feature.values];
                  
                  return (
                    <div key={planData.plan.priceId} className="p-4 text-center border-r last:border-r-0">
                      {typeof value === 'boolean' ? (
                        value ? (
                          <Check className="h-5 w-5 text-success mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-destructive mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium">{value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            All plans include secure payment processing and can be cancelled anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
