import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PRICING_PLANS } from "@/hooks/useSubscription";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Check, Crown, Loader2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SubscriptionManagement() {
  const { subscribed, plan, subscription_end, isLoading, createCheckout, openCustomerPortal } = useSubscription();
  const { currentPlan, planLimits, currentUsage } = usePlanLimits();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string, planKey: string) => {
    setProcessingPlan(planKey);
    await createCheckout(priceId);
    setProcessingPlan(null);
  };

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">Manage your plan, billing, and add-ons</p>
      </div>

      {/* Current Plan Status */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan: {planLimits.name}</CardTitle>
              {subscribed && subscription_end && (
                <CardDescription>
                  Renews on {new Date(subscription_end).toLocaleDateString()}
                </CardDescription>
              )}
            </div>
            <Badge variant="secondary">${planLimits.price}/month</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bank Connections</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.bankConnections}/{planLimits.bankConnections === 999 ? '∞' : planLimits.bankConnections}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ 
                    width: planLimits.bankConnections === 999 ? '10%' : `${Math.min((currentUsage.bankConnections / planLimits.bankConnections) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Amazon Connections</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.amazonConnections}/{planLimits.amazonConnections === 999 ? '∞' : planLimits.amazonConnections}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ 
                    width: planLimits.amazonConnections === 999 ? '10%' : `${Math.min((currentUsage.amazonConnections / planLimits.amazonConnections) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {subscribed && (
            <div className="pt-4 border-t">
              <Button onClick={handleManageSubscription} variant="outline" className="w-full md:w-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription & Billing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PRICING_PLANS).map(([key, planData]) => {
            const isCurrentPlan = plan === key;
            const isProfessional = key === 'professional';
            
            return (
              <Card 
                key={key}
                className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''} ${isProfessional ? 'border-primary' : ''}`}
              >
                {isProfessional && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      {key === 'professional' && <Crown className="h-5 w-5 text-primary" />}
                      {planData.name}
                    </CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold">
                    ${planData.price}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {planData.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {!isCurrentPlan && (
                    <Button
                      onClick={() => handleUpgrade(planData.price_id, key)}
                      disabled={processingPlan === key}
                      className={`w-full ${isProfessional ? 'bg-gradient-primary' : ''}`}
                      variant={isProfessional ? 'default' : 'outline'}
                    >
                      {processingPlan === key ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Upgrade Plan'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          <strong>Need more connections?</strong> Visit the Add Account section to purchase additional add-ons for bank accounts and Amazon connections.
        </AlertDescription>
      </Alert>
    </div>
  );
}
