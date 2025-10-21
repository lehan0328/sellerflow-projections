import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PRICING_PLANS } from "@/hooks/useSubscription";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Check, Crown, Loader2, ExternalLink, XCircle, Star, HardDrive } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CancellationFlow } from "@/components/subscription/CancellationFlow";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const { 
    subscribed, 
    plan, 
    subscription_end, 
    is_trialing, 
    isLoading, 
    createCheckout, 
    openCustomerPortal,
    billing_interval,
    current_period_start,
    price_amount,
    currency,
    discount
  } = useSubscription();
  const { currentPlan, planLimits, currentUsage } = usePlanLimits();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);

  // Storage limit: 2GB for all users
  const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2GB in bytes

  // Fetch user's account_id
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch storage usage
  const { data: storageUsage } = useQuery({
    queryKey: ['storage-usage', profile?.account_id],
    queryFn: async () => {
      if (!profile?.account_id) return 0;
      
      // Fetch all documents metadata
      const { data: metadata, error: metadataError } = await supabase
        .from('documents_metadata')
        .select('file_name, file_path')
        .eq('account_id', profile.account_id);

      if (metadataError) throw metadataError;

      // Fetch storage files to get sizes
      let totalSize = 0;
      try {
        const { data: storageFiles, error: filesError } = await supabase.storage
          .from('purchase-orders')
          .list(profile.account_id);

        if (!filesError && storageFiles) {
          totalSize = storageFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
        }
      } catch (error) {
        console.warn('Could not fetch storage files:', error);
      }

      return totalSize;
    },
    enabled: !!profile?.account_id,
  });

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const storagePercentage = ((storageUsage || 0) / STORAGE_LIMIT_BYTES) * 100;

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
    <div className="min-h-screen flex flex-col items-center p-6 space-y-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">Manage your plan, billing, and add-ons</p>
        </div>

        {/* Current Plan Status */}
        <Card className="border-primary/30 max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>
                  {is_trialing ? 'Professional Plan (Trial)' : `Current Plan: ${planLimits.name}`}
                </CardTitle>
                {subscribed && subscription_end ? (
                  <div className="space-y-1">
                    {is_trialing ? (
                      <CardDescription className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          Trial Ends {new Date(subscription_end).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    ) : (
                      <>
                        <CardDescription>
                          <span className="font-medium">Billing:</span> {billing_interval === 'year' ? 'Yearly' : 'Monthly'}
                        </CardDescription>
                        {current_period_start && (
                          <CardDescription>
                            <span className="font-medium">Last Renewed:</span> {new Date(current_period_start).toLocaleDateString()}
                          </CardDescription>
                        )}
                        <CardDescription>
                          <span className="font-medium">Next Due Date:</span> {new Date(subscription_end).toLocaleDateString()}
                        </CardDescription>
                        {discount && (
                          <CardDescription className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <Check className="h-4 w-4" />
                            <span className="font-medium">
                              {discount.percent_off ? `${discount.percent_off}% discount` : `$${(discount.amount_off! / 100).toFixed(2)} discount`} applied
                              {discount.duration === 'repeating' && discount.duration_in_months ? ` for ${discount.duration_in_months} months` : ''}
                            </span>
                          </CardDescription>
                        )}
                      </>
                    )}
                  </div>
                ) : subscribed && !subscription_end ? (
                  <CardDescription className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">Lifetime Access - No billing required</span>
                  </CardDescription>
                ) : null}
              </div>
              {price_amount && currency ? (
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  ${(price_amount / 100).toFixed(0)}/{billing_interval === 'year' ? 'year' : 'month'}
                </Badge>
              ) : (
                <Badge variant="secondary">${planLimits.price}/month</Badge>
              )}
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Financial Connections</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.bankConnections}/{planLimits.bankConnections === 999 ? '∞' : planLimits.bankConnections}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">Banks + Credit Cards</div>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  Document Storage
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatBytes(storageUsage || 0)} / 2GB
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">All Plans</div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    storagePercentage > 90 ? 'bg-destructive' : storagePercentage > 75 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ 
                    width: `${Math.min(storagePercentage, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {subscribed && (
            <div className="pt-4 border-t flex gap-2">
              <Button onClick={handleManageSubscription} variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription & Billing
              </Button>
              <Button 
                onClick={() => setShowCancellationFlow(true)} 
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Available Plans */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">Available Plans</h2>
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
        <Alert className="max-w-2xl mx-auto">
        <AlertDescription>
          <strong>Need more connections?</strong> Visit the Add Account section to purchase additional add-ons for financial connections (banks & credit cards) and Amazon connections.
        </AlertDescription>
      </Alert>

        {/* Cancellation Flow Modal */}
        <CancellationFlow 
          open={showCancellationFlow} 
          onOpenChange={setShowCancellationFlow} 
        />
      </div>
    </div>
  );
}
