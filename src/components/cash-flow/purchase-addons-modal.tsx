import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, ShoppingCart, Check, Zap, Crown } from "lucide-react";
import { usePlanLimits, PlanType } from "@/hooks/usePlanLimits";
import { useSubscription, ADDON_PRODUCTS, PRICING_PLANS } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface PurchaseAddonsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PurchaseAddonsModal = ({ open, onOpenChange }: PurchaseAddonsModalProps) => {
  const { currentPlan, planLimits, currentUsage, PLAN_LIMITS } = usePlanLimits();
  const { purchaseAddon, createCheckout } = useSubscription();

  const handlePurchaseAddon = async (type: 'bank' | 'amazon') => {
    const priceId = type === 'bank' ? ADDON_PRODUCTS.bank_account.price_id : ADDON_PRODUCTS.amazon_account.price_id;
    await purchaseAddon(priceId);
    onOpenChange(false);
  };

  const handleUpgradePlan = async (planKey: string) => {
    const planData = PRICING_PLANS[planKey as keyof typeof PRICING_PLANS];
    if (planData) {
      await createCheckout(planData.price_id);
      onOpenChange(false);
    }
  };

  const addOnPrice = {
    bank: ADDON_PRODUCTS.bank_account.price,
    amazon: ADDON_PRODUCTS.amazon_account.price
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Purchase Add-ons & Upgrades</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Plan Status */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Current Plan: {planLimits.name}</CardTitle>
                <Badge variant="secondary">${planLimits.price}/month</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bank Connections</span>
                    <span className="text-sm font-medium">
                      {currentUsage.bankConnections}/{planLimits.bankConnections === 999 ? '∞' : planLimits.bankConnections}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ 
                        width: planLimits.bankConnections === 999 ? '10%' : `${(currentUsage.bankConnections / planLimits.bankConnections) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Amazon Connections</span>
                    <span className="text-sm font-medium">
                      {currentUsage.amazonConnections}/{planLimits.amazonConnections === 999 ? '∞' : planLimits.amazonConnections}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: planLimits.amazonConnections === 999 ? '10%' : `${(currentUsage.amazonConnections / planLimits.amazonConnections) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Add-ons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Purchase Individual Add-ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>Bank Connection Add-on</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect additional bank accounts via Plaid for comprehensive cash flow tracking.
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">${addOnPrice.bank}/month per connection</span>
                    </div>
                    <p className="text-xs text-muted-foreground">7-day free trial included</p>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handlePurchaseAddon('bank')}
                    >
                      Start 7-Day Trial - ${addOnPrice.bank}/mo after
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Amazon Connection Add-on</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect additional Amazon Seller Central accounts for multi-marketplace management.
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">${addOnPrice.amazon}/month per connection</span>
                    </div>
                    <p className="text-xs text-muted-foreground">7-day free trial included</p>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handlePurchaseAddon('amazon')}
                    >
                      Start 7-Day Trial - ${addOnPrice.amazon}/mo after
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Plan Upgrades */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Or Upgrade Your Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(PLAN_LIMITS) as [PlanType, typeof PLAN_LIMITS[PlanType]][]).map(([planKey, plan]) => (
                <Card 
                  key={planKey}
                  className={`${currentPlan === planKey ? 'ring-2 ring-primary' : ''} ${planKey === 'professional' ? 'border-primary' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        {planKey === 'enterprise' && <Crown className="h-4 w-4" />}
                        <span>{plan.name}</span>
                      </CardTitle>
                      {planKey === 'professional' && (
                        <Badge variant="secondary">Most Popular</Badge>
                      )}
                      {currentPlan === planKey && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">${plan.price}<span className="text-sm font-normal">/month</span></div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {plan.bankConnections === 999 ? 'Unlimited' : plan.bankConnections} Bank Connections
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {plan.amazonConnections === 999 ? 'Unlimited' : plan.amazonConnections} Amazon Connections
                        </span>
                      </div>
                      {planKey === 'professional' && (
                        <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Priority Support</span>
                        </div>
                      )}
                      {planKey === 'enterprise' && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Dedicated Account Manager</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Custom Integrations</span>
                          </div>
                        </>
                      )}
                    </div>
                    {currentPlan !== planKey && (
                      <Button 
                        className={`w-full ${planKey === 'professional' ? 'bg-gradient-primary' : ''}`}
                        variant={planKey === 'professional' ? 'default' : 'outline'}
                        onClick={() => handleUpgradePlan(planKey)}
                      >
                        {planKey === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This is a demo version. In production, we'd integrate with Stripe for secure payment processing.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};