import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PRICING_PLANS } from "@/hooks/useSubscription";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  currentLimit?: string;
}

export const UpgradeModal = ({ open, onOpenChange, feature = "connections", currentLimit }: UpgradeModalProps) => {
  const navigate = useNavigate();
  const subscription = useSubscription();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings?tab=subscription');
  };

  const handlePurchaseAddons = () => {
    onOpenChange(false);
    navigate('/settings?tab=addons');
  };

  const currentPlan = subscription.plan || 'starter';
  const nextPlans = Object.entries(PRICING_PLANS).filter(([key]) => {
    if (currentPlan === 'starter') return key === 'growing' || key === 'professional';
    if (currentPlan === 'growing') return key === 'professional';
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            You've reached your plan's limit for {feature}. {currentLimit && `Current limit: ${currentLimit}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h3 className="font-semibold">Choose an option:</h3>
            
            {nextPlans.length > 0 && (
              <Card className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={handleUpgrade}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">Upgrade to {nextPlans[0][1].name}</h4>
                      <p className="text-sm text-muted-foreground">Get more {feature} and additional features</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">${nextPlans[0][1].price}</div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nextPlans[0][1].features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Check className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full bg-gradient-primary" size="sm">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-4 hover:border-primary/20 transition-colors cursor-pointer" onClick={handlePurchaseAddons}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Purchase Add-ons</h4>
                    <p className="text-sm text-muted-foreground">Add individual {feature} to your current plan</p>
                  </div>
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  View Add-ons
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
