import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Shield,
  Check,
  Star,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PRICING_PLANS, ADDON_PRODUCTS } from "@/hooks/useSubscription";

const UpgradePlan = () => {
  const navigate = useNavigate();
  const { subscribed, plan, subscription_end, createCheckout, purchaseAddon, openCustomerPortal, isLoading } = useSubscription();

  const plans = [
    {
      key: "starter",
      name: PRICING_PLANS.starter.name,
      price: PRICING_PLANS.starter.price,
      priceId: PRICING_PLANS.starter.price_id,
      features: PRICING_PLANS.starter.features,
      popular: false,
    },
    {
      key: "growing",
      name: PRICING_PLANS.growing.name,
      price: PRICING_PLANS.growing.price,
      priceId: PRICING_PLANS.growing.price_id,
      features: PRICING_PLANS.growing.features,
      popular: true,
    },
    {
      key: "professional",
      name: PRICING_PLANS.professional.name,
      price: PRICING_PLANS.professional.price,
      priceId: PRICING_PLANS.professional.price_id,
      features: PRICING_PLANS.professional.features,
      popular: false,
    }
  ];

  const handleUpgrade = (priceId: string) => {
    createCheckout(priceId);
  };

  const handlePurchaseAddon = (priceId: string) => {
    purchaseAddon(priceId);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-2">
                  <Shield className="h-6 w-6" />
                  <span>Upgrade Plan</span>
                </h1>
                <p className="text-muted-foreground">
                  Choose the perfect plan for your business needs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Current Account Status */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Current Plan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : subscribed && plan ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plan</span>
                      <Badge className="bg-gradient-primary">
                        {PRICING_PLANS[plan].name} - ${PRICING_PLANS[plan].price}/mo
                      </Badge>
                    </div>
                    {subscription_end && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Renews</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(subscription_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plan</span>
                      <Badge variant="secondary">No Active Plan</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upgrade to unlock all features and grow your business
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plans */}
          <div className="lg:col-span-3">
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((planItem) => {
                const isCurrent = plan === planItem.key;
                return (
                  <Card 
                    key={planItem.name} 
                    className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''} ${planItem.popular ? 'ring-2 ring-accent' : ''}`}
                  >
                    {planItem.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge variant="default">Current Plan</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle>{planItem.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        ${planItem.price}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </div>
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
                        variant={isCurrent ? "outline" : planItem.popular ? "default" : "outline"}
                        disabled={isCurrent || isLoading}
                        onClick={() => handleUpgrade(planItem.priceId)}
                      >
                        {isCurrent ? "Current Plan" : "Upgrade Now"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add-ons Section */}
            {subscribed && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Add-ons</CardTitle>
                  <CardDescription>
                    Enhance your plan with additional features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {addons.map((addon) => (
                      <Card key={addon.key}>
                        <CardHeader>
                          <CardTitle className="text-lg">{addon.name}</CardTitle>
                          <CardDescription>{addon.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-2xl font-bold">
                            ${addon.price}
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </div>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => handlePurchaseAddon(addon.priceId)}
                            disabled={isLoading}
                          >
                            Purchase Add-on
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Need help choosing?</CardTitle>
                <CardDescription>
                  Not sure which plan is right for you? Our team can help you find the perfect fit for your business needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlan;