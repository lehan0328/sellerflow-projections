import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Shield,
  ShoppingBag,
  Plus,
  Check,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { PurchaseAddonsModal } from "@/components/cash-flow/purchase-addons-modal";
import { AddAccountModal } from "@/components/cash-flow/add-account-modal";

const UpgradePlan = () => {
  const navigate = useNavigate();
  const [showPurchaseAddonsModal, setShowPurchaseAddonsModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const plans = [
    {
      name: "Starter",
      price: 29,
      current: true,
      features: [
        "2 Bank Connections",
        "1 Amazon Connection", 
        "10 GB Storage",
        "Basic Analytics",
        "Email Support"
      ]
    },
    {
      name: "Professional", 
      price: 79,
      current: false,
      popular: true,
      features: [
        "5 Bank Connections",
        "3 Amazon Connections",
        "50 GB Storage", 
        "Advanced Analytics",
        "Priority Support",
        "Custom Reports"
      ]
    },
    {
      name: "Enterprise",
      price: 199,
      current: false,
      features: [
        "Unlimited Bank Connections",
        "Unlimited Amazon Connections",
        "500 GB Storage",
        "Enterprise Analytics",
        "24/7 Phone Support",
        "Custom Integrations",
        "Dedicated Account Manager"
      ]
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
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plan</span>
                  <Badge className="bg-gradient-primary">Starter - $29/mo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Used</span>
                  <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bank Connections</span>
                  <span className="text-sm text-muted-foreground">1 of 2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Amazon Connections</span>
                  <span className="text-sm text-muted-foreground">0 of 1</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    className="w-full bg-gradient-primary"
                    onClick={() => setShowPurchaseAddonsModal(true)}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Purchase Add-ons
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddAccountModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plans */}
          <div className="lg:col-span-3">
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.name} className={`relative ${plan.current ? 'ring-2 ring-primary' : ''} ${plan.popular ? 'ring-2 ring-accent' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-primary">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {plan.current && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge variant="default">Current Plan</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-primary mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={plan.current ? "outline" : plan.popular ? "default" : "outline"}
                      disabled={plan.current}
                    >
                      {plan.current ? "Current Plan" : "Upgrade Now"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Need help choosing?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Not sure which plan is right for you? Our team can help you find the perfect fit for your business needs.
                </p>
                <Button variant="outline">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <PurchaseAddonsModal
        open={showPurchaseAddonsModal}
        onOpenChange={setShowPurchaseAddonsModal}
      />
      
      <AddAccountModal
        open={showAddAccountModal}
        onOpenChange={setShowAddAccountModal}
      />
    </div>
  );
};

export default UpgradePlan;