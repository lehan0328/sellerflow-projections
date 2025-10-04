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
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PRICING_PLANS, ADDON_PRODUCTS } from "@/hooks/useSubscription";

interface CartItem {
  priceId: string;
  name: string;
  price: number;
  quantity: number;
}

const UpgradePlan = () => {
  const navigate = useNavigate();
  const { subscribed, plan, subscription_end, createCheckout, purchaseAddon, openCustomerPortal, isLoading } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({
    bank_account: 1,
    amazon_account: 1,
    user: 1
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

  const addToCart = (addon: typeof addons[0], quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.priceId === addon.priceId);
      if (existing) {
        return prev.map(item => 
          item.priceId === addon.priceId 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { priceId: addon.priceId, name: addon.name, price: addon.price, quantity }];
    });
    // Reset quantity after adding to cart
    setAddonQuantities(prev => ({ ...prev, [addon.key]: 1 }));
  };

  const updateCartQuantity = (priceId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.priceId !== priceId));
    } else {
      setCart(prev => prev.map(item => 
        item.priceId === priceId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (priceId: string) => {
    setCart(prev => prev.filter(item => item.priceId !== priceId));
  };

  const handleCheckoutCart = async () => {
    if (cart.length === 0) return;
    
    const lineItems = cart.map(item => ({
      price: item.priceId,
      quantity: item.quantity
    }));
    
    await createCheckout(undefined, lineItems);
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
                        variant={isCurrent ? "outline" : planItem.popular ? "default" : "outline"}
                        disabled={isCurrent || isLoading}
                        onClick={() => handleUpgrade(getCurrentPriceId(planItem))}
                      >
                        {isCurrent ? "Current Plan" : subscribed ? "Upgrade Now" : "Start 7-Day Free Trial"}
                      </Button>
                      {!isCurrent && !subscribed && (
                        <p className="text-xs text-muted-foreground text-center">
                          Then ${isYearly ? planItem.yearlyPrice + '/year' : planItem.price + '/month'}. Cancel anytime.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add-ons Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Add-ons</CardTitle>
                <CardDescription>
                  Select quantity and add to cart to purchase multiple add-ons together
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
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">
                            ${addon.price}
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </div>
                          <p className="text-xs text-orange-600 font-medium">Billed immediately</p>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setAddonQuantities(prev => ({ 
                              ...prev, 
                              [addon.key]: Math.max(1, prev[addon.key] - 1) 
                            }))}
                            disabled={addonQuantities[addon.key] <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-lg font-semibold w-12 text-center">
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
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => addToCart(addon, addonQuantities[addon.key])}
                          disabled={isLoading}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cart Section */}
            {cart.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                    </span>
                    <Badge variant="secondary" className="text-lg">
                      Total: ${cartTotal}/month
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.priceId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">${item.price}/month × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.priceId, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold w-8 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.priceId, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="font-bold min-w-[80px] text-right">
                          ${item.price * item.quantity}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFromCart(item.priceId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCart([])}
                    >
                      Clear Cart
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleCheckoutCart}
                      disabled={isLoading}
                      className="bg-gradient-primary"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Checkout (${cartTotal}/month)
                    </Button>
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