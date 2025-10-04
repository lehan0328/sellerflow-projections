import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { 
  ArrowLeft,
  Shield,
  Check,
  Star,
  Settings,
  ShoppingCart,
  Plus,
  Minus,
  XCircle,
  TrendingUp,
  ArrowDown,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PRICING_PLANS, ADDON_PRODUCTS } from "@/hooks/useSubscription";
import { CancellationFlow } from "@/components/subscription/CancellationFlow";

interface CartItem {
  priceId: string;
  name: string;
  price: number;
  quantity: number;
}

const UpgradePlan = () => {
  const navigate = useNavigate();
  const { subscribed, plan, subscription_end, createCheckout, purchaseAddon, openCustomerPortal, removePlanOverride, isLoading } = useSubscription();
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({
    bank_account: 0,
    amazon_account: 0,
    user: 0
  });

  const plans = [
    {
      key: "starter",
      name: PRICING_PLANS.starter.name,
      price: PRICING_PLANS.starter.price,
      yearlyPrice: PRICING_PLANS.starter.yearlyPrice,
      priceId: PRICING_PLANS.starter.price_id,
      yearlyPriceId: PRICING_PLANS.starter.yearly_price_id,
      features: PRICING_PLANS.starter.features,
      popular: false,
      savings: "$58"
    },
    {
      key: "growing",
      name: PRICING_PLANS.growing.name,
      price: PRICING_PLANS.growing.price,
      yearlyPrice: PRICING_PLANS.growing.yearlyPrice,
      priceId: PRICING_PLANS.growing.price_id,
      yearlyPriceId: PRICING_PLANS.growing.yearly_price_id,
      features: PRICING_PLANS.growing.features,
      popular: true,
      savings: "$118"
    },
    {
      key: "professional",
      name: PRICING_PLANS.professional.name,
      price: PRICING_PLANS.professional.price,
      yearlyPrice: PRICING_PLANS.professional.yearlyPrice,
      priceId: PRICING_PLANS.professional.price_id,
      yearlyPriceId: PRICING_PLANS.professional.yearly_price_id,
      features: PRICING_PLANS.professional.features,
      popular: false,
      savings: "$178"
    }
  ];

  const handleUpgrade = (priceId: string) => {
    createCheckout(priceId);
  };

  const handlePurchaseAddon = (priceId: string) => {
    purchaseAddon(priceId);
  };

  const getCurrentPriceId = (planItem: typeof plans[0]) => {
    return isYearly ? planItem.yearlyPriceId : planItem.priceId;
  };

  const addons = [
    {
      key: "bank_account",
      name: ADDON_PRODUCTS.bank_account.name,
      price: ADDON_PRODUCTS.bank_account.price,
      priceId: ADDON_PRODUCTS.bank_account.price_id,
      description: ADDON_PRODUCTS.bank_account.description,
    },
    {
      key: "amazon_account",
      name: ADDON_PRODUCTS.amazon_account.name,
      price: ADDON_PRODUCTS.amazon_account.price,
      priceId: ADDON_PRODUCTS.amazon_account.price_id,
      description: ADDON_PRODUCTS.amazon_account.description,
    },
    {
      key: "user",
      name: ADDON_PRODUCTS.user.name,
      price: ADDON_PRODUCTS.user.price,
      priceId: ADDON_PRODUCTS.user.price_id,
      description: ADDON_PRODUCTS.user.description,
    }
  ];

  const handleCheckoutAddons = async () => {
    // Build line items from quantities > 0
    const lineItems = addons
      .filter(addon => addonQuantities[addon.key] > 0)
      .map(addon => ({
        price: addon.priceId,
        quantity: addonQuantities[addon.key]
      }));
    
    if (lineItems.length === 0) {
      return;
    }
    
    await createCheckout(undefined, lineItems);
    
    // Reset quantities after checkout
    setAddonQuantities({
      bank_account: 0,
      amazon_account: 0,
      user: 0
    });
  };

  const cartTotal = addons.reduce((sum, addon) => 
    sum + (addon.price * addonQuantities[addon.key]), 0
  );

  const totalItems = Object.values(addonQuantities).reduce((sum, qty) => sum + qty, 0);

  // Determine the next higher tier
  const planHierarchy = { starter: 1, growing: 2, professional: 3 };
  const currentPlanLevel = plan ? planHierarchy[plan] : 0;
  const nextTierKey = Object.entries(planHierarchy).find(([_, level]) => level === currentPlanLevel + 1)?.[0];
  const nextTier = nextTierKey ? plans.find(p => p.key === nextTierKey) : null;
  const currentTierData = plan ? plans.find(p => p.key === plan) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="self-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center justify-center space-x-2">
                <Shield className="h-8 w-8" />
                <span>Upgrade Plan</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Choose the perfect plan for your business needs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Current Account Status */}
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Current Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center">Loading...</p>
              ) : subscribed && plan ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plan</span>
                    <Badge className="bg-gradient-primary">
                      {PRICING_PLANS[plan].name} - ${PRICING_PLANS[plan].price}/mo
                    </Badge>
                  </div>
                  {subscription_end ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Renews</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(subscription_end).toLocaleDateString()}
                        </span>
                      </div>
                      <Separator />
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full"
                        onClick={openCustomerPortal}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </Button>
                    </>
                   ) : (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 p-4 bg-primary/5 rounded-lg">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="text-sm font-semibold text-primary">Lifetime Access - No billing required</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full"
                          onClick={removePlanOverride}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Switch to Monthly Subscription
                        </Button>
                      </div>
                    </>
                  )}
                  {subscribed && (
                    <div className="flex gap-2">
                      {!isYearly && subscription_end && plan && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 bg-gradient-primary"
                          onClick={() => handleUpgrade(PRICING_PLANS[plan].yearly_price_id)}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Upgrade to Yearly (Save {plans.find(p => p.key === plan)?.savings})
                        </Button>
                      )}
                      {subscription_end && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setShowCancellationFlow(true)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plan</span>
                    <Badge variant="secondary">No Active Plan</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Upgrade to unlock all features and grow your business
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Comparison */}
        {subscribed && plan && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your Plan Benefits</h2>
              <p className="text-muted-foreground">
                {nextTier ? `Compare your current plan with ${nextTier.name}` : 'You\'re on the highest tier!'}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
              {/* Current Plan */}
              {currentTierData && (
                <Card className="relative ring-2 ring-primary">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="default">Current Plan</Badge>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle>{currentTierData.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      ${isYearly ? currentTierData.yearlyPrice : currentTierData.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        {isYearly ? '/year' : '/month'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {currentTierData.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Next Tier or Professional Benefits */}
              {nextTier ? (
                <Card className="relative ring-2 ring-accent">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Upgrade Available
                    </Badge>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle>{nextTier.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      ${isYearly ? nextTier.yearlyPrice : nextTier.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        {isYearly ? '/year' : '/month'}
                      </span>
                    </div>
                    {isYearly && (
                      <Badge variant="secondary" className="text-xs mx-auto">
                        Save {nextTier.savings}/year
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {nextTier.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full bg-gradient-primary" 
                      onClick={() => handleUpgrade(getCurrentPriceId(nextTier))}
                      disabled={isLoading}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade to {nextTier.name}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="relative">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Maximum Features Unlocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      You're enjoying all the benefits of our highest tier plan!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Billing Toggle */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">Switch to {isYearly ? 'Monthly' : 'Yearly'} Billing</h3>
                    <p className="text-sm text-muted-foreground">
                      {isYearly 
                        ? 'Switch to monthly billing for more flexibility' 
                        : `Save ${currentTierData?.savings || '$58'} per year with annual billing`
                      }
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsYearly(!isYearly)}
                  >
                    {isYearly ? 'Switch to Monthly' : 'Switch to Yearly'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Downgrade Option */}
            {currentPlanLevel > 1 && (
              <Card className="max-w-2xl mx-auto border-destructive/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Need to Downgrade?</h3>
                      <p className="text-sm text-muted-foreground">
                        Switch to a lower tier plan if your needs have changed
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={openCustomerPortal}
                    >
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Manage Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Plans for non-subscribed users */}
        {!subscribed && (
          <div>
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-center gap-4">
                  <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
                        isYearly ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
                  Yearly <Badge variant="secondary" className="ml-1">Save 2 months</Badge>
                </span>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                  7-day free trial • Credit card required • Cancel anytime
                </Badge>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
                {plans.map((planItem) => (
                  <Card 
                    key={planItem.name} 
                    className={`relative ${planItem.popular ? 'ring-2 ring-accent' : ''}`}
                  >
                    {planItem.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle>{planItem.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        ${isYearly ? planItem.yearlyPrice : planItem.price}
                        <span className="text-sm font-normal text-muted-foreground">{isYearly ? '/year' : '/month'}</span>
                      </div>
                      {isYearly && (
                        <Badge variant="secondary" className="text-xs mx-auto">
                          Save {planItem.savings}/year
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {planItem.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={planItem.popular ? "default" : "outline"}
                        onClick={() => handleUpgrade(getCurrentPriceId(planItem))}
                        disabled={isLoading}
                      >
                        Start 7-Day Free Trial
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Then ${isYearly ? planItem.yearlyPrice + '/year' : planItem.price + '/month'}. Cancel anytime.
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Add-ons Cart Section */}
        <Card className="mt-6 max-w-6xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Add-ons
                  </span>
                  {totalItems > 0 && (
                    <Badge variant="secondary" className="text-base">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'} • ${cartTotal}/month
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Select the quantity for each add-on you need (starts at 0)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {addons.map((addon) => (
                  <div 
                    key={addon.key}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                      addonQuantities[addon.key] > 0 ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-semibold">{addon.name}</h4>
                          <p className="text-sm text-muted-foreground">{addon.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold">${addon.price}/month</span>
                            <span className="text-xs text-orange-600">Billed immediately</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setAddonQuantities(prev => ({ 
                            ...prev, 
                            [addon.key]: Math.max(0, prev[addon.key] - 1) 
                          }))}
                          disabled={addonQuantities[addon.key] <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xl font-bold w-12 text-center">
                          {addonQuantities[addon.key]}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setAddonQuantities(prev => ({ 
                            ...prev, 
                            [addon.key]: prev[addon.key] + 1 
                          }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {addonQuantities[addon.key] > 0 && (
                        <div className="font-bold text-lg min-w-[100px] text-right">
                          ${addon.price * addonQuantities[addon.key]}/mo
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {totalItems > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Monthly Total</p>
                        <p className="text-3xl font-bold">${cartTotal}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAddonQuantities({
                            bank_account: 0,
                            amazon_account: 0,
                            user: 0
                          })}
                        >
                          Reset
                        </Button>
                        <Button
                          size="lg"
                          onClick={handleCheckoutAddons}
                          disabled={isLoading}
                          className="bg-gradient-primary"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Checkout Now
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                {totalItems === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select add-ons above to get started</p>
                  </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="mt-6 max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Need help choosing?</CardTitle>
              <CardDescription className="text-center">
                Not sure which plan is right for you? Our team can help you find the perfect fit for your business needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline">Contact Sales</Button>
            </CardContent>
        </Card>
      </div>

      {/* Cancellation Flow Modal */}
      <CancellationFlow 
        open={showCancellationFlow} 
        onOpenChange={setShowCancellationFlow} 
      />
    </div>
  );
};

export default UpgradePlan;