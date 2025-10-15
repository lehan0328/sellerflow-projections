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
  onUpgradeClick?: () => void;
}

export const UpgradeModal = ({ open, onOpenChange, feature = "connections", currentLimit, onUpgradeClick }: UpgradeModalProps) => {
  const navigate = useNavigate();
  const subscription = useSubscription();

  const handleUpgrade = () => {
    onOpenChange(false);
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate('/settings?tab=subscription');
    }
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
          <DialogTitle className="text-2xl">Professional Plan Required</DialogTitle>
          <DialogDescription>
            This is a Professional plan feature. {subscription.is_trialing && "Your trial includes Professional features - this will be available once you upgrade after your trial ends."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Professional Plan Features
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• 7 bank/credit card connections</li>
                <li>• Automated notifications</li>
                <li>• Scenario planning</li>
                <li>• AI insights</li>
                <li>• AI PDF extractor</li>
                <li>• 5 additional users</li>
                <li>• Advanced analytics</li>
                <li>• Priority support</li>
              </ul>
            </div>
            
            {nextPlans.length > 0 && (
              <Card className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={handleUpgrade}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">Upgrade to Professional</h4>
                      <p className="text-sm text-muted-foreground">Unlock all premium features</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$89</div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-primary" size="sm">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
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
