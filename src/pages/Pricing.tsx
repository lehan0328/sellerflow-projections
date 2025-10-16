import { useState } from 'react';
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowLeft, Moon, Sun, Lock, Shield, Star } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { useTheme } from "next-themes";

export default function Pricing() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isYearly, setIsYearly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnterpriseCustomizer, setShowEnterpriseCustomizer] = useState(false);
  const [enterpriseTier, setEnterpriseTier] = useState<"tier1" | "tier2" | "tier3">("tier1");
  const [enterpriseAddons, setEnterpriseAddons] = useState({
    bankConnections: 0,
    amazonConnections: 0,
    users: 0
  });

  const enterpriseTiers = {
    tier1: { 
      revenue: "$200k - $500k", 
      price: 149,
      yearlyPrice: 1490,
      connections: 5, 
      amazon: 2, 
      users: 7,
      priceId: "price_1SF1uxB28kMY3Use2W39zzO4",
      yearlyPriceId: "price_1SF2OZB28kMY3Use6rLIlv5g"
    },
    tier2: { 
      revenue: "$500k - $1M", 
      price: 299,
      yearlyPrice: 2990,
      connections: 5, 
      amazon: 2, 
      users: 7,
      priceId: "price_1SF1v8B28kMY3UseVLxkFEvr",
      yearlyPriceId: "price_1SF2OnB28kMY3UseHsTG7DNZ"
    },
    tier3: { 
      revenue: "$1M+", 
      price: 499,
      yearlyPrice: 4990,
      connections: 5, 
      amazon: 2, 
      users: 7,
      priceId: "price_1SF1vLB28kMY3UseRb0kIQNY",
      yearlyPriceId: "price_1SF2OxB28kMY3UseUanKSxA2"
    }
  };

  const addonPricing = {
    bankConnection: 10,
    amazonConnection: 50,
    user: 5
  };

  const calculateEnterprisePrice = () => {
    const tier = enterpriseTiers[enterpriseTier];
    const basePrice = isYearly ? tier.yearlyPrice : tier.price;
    const multiplier = isYearly ? 10 : 1;
    const addonCost = 
      (enterpriseAddons.bankConnections * addonPricing.bankConnection * multiplier) +
      (enterpriseAddons.amazonConnections * addonPricing.amazonConnection * multiplier) +
      (enterpriseAddons.users * addonPricing.user * multiplier);
    return basePrice + addonCost;
  };

  const handleStartTrial = async (priceId: string) => {
    setIsLoading(true);
    try {
      if (priceId === "enterprise") {
        setShowEnterpriseCustomizer(true);
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/signup");
        return;
      }

      navigate("/dashboard");
      toast.success("Welcome! Your trial has started.");
    } catch (error) {
      console.error("Error starting trial:", error);
      toast.error("Failed to start trial. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      yearlyPrice: "$24",
      period: "/month",
      yearlyPeriod: "/month",
      description: "Up to $20k monthly revenue",
      popular: false,
      priceId: "price_1SEH8NB28kMY3UseBj2w9HgH",
      yearlyPriceId: "price_1SEHZGB28kMY3UseCkWIlnWw",
      savings: "$58"
    },
    {
      name: "Growing",
      price: "$59",
      yearlyPrice: "$49",
      period: "/month",
      yearlyPeriod: "/month",
      description: "Up to $100k monthly revenue",
      popular: true,
      priceId: "price_1SEH8iB28kMY3Usem3k3vElT",
      yearlyPriceId: "price_1SEHZVB28kMY3Use9bH8xPlg",
      savings: "$118"
    },
    {
      name: "Professional",
      price: "$89",
      yearlyPrice: "$74",
      period: "/month",
      yearlyPeriod: "/month",
      description: "Up to $200k monthly revenue",
      popular: false,
      priceId: "price_1SEHBHB28kMY3UsenQEY0qoT",
      yearlyPriceId: "price_1SEHZfB28kMY3UseZKmLEcPk",
      savings: "$178"
    },
    {
      name: "Enterprise",
      price: "Custom",
      yearlyPrice: "Custom",
      period: "",
      yearlyPeriod: "",
      description: "$200k+ monthly revenue",
      popular: false,
      priceId: "enterprise",
      yearlyPriceId: "enterprise",
      savings: ""
    },
  ];

  const featureComparison = [
    { feature: "Smart Purchase Planning", signature: true, starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Safe Spending Power", signature: true, starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Buying Opportunity Projection", signature: true, starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Payout Forecasting", signature: true, starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Bank/Credit Card Connections", starter: "2", growing: "3", professional: "4", enterprise: "5 + add-ons" },
    { feature: "Amazon Connections", starter: "1", growing: "1", professional: "1", enterprise: "2 + add-ons" },
    { feature: "Additional Users", starter: false, growing: "2", professional: "5", enterprise: "7 + add-ons" },
    { feature: "Advanced Forecasting Workflow", starter: true, growing: true, professional: true, enterprise: true },
    { feature: "365-Day Cash Flow Projection", starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Bank Transaction Matching", starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Ai Insights", signature: true, starter: false, growing: true, professional: true, enterprise: true },
    { feature: "Ai PDF Extractor", signature: true, starter: false, growing: true, professional: true, enterprise: true },
    { feature: "Document Storage", starter: false, growing: true, professional: true, enterprise: true },
    { feature: "Scenario Planning", starter: false, growing: false, professional: true, enterprise: true },
    { feature: "Analytics", starter: false, growing: "Basic", professional: "Advanced", enterprise: "Custom" },
    { feature: "1:1 Hands-on Setup", starter: false, growing: false, professional: false, enterprise: true },
    { feature: "Dedicated Account Manager", starter: false, growing: false, professional: false, enterprise: true },
    { feature: "Support", starter: "Email", growing: "Priority", professional: "Priority", enterprise: "24/7 Phone" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Marketplace Cashflow Software Pricing | Auren - Amazon Plans</title>
        <meta name="description" content="Simple pricing for powerful Amazon and marketplace cashflow management. Start forecasting your profits today. Plans from $24/month." />
        <meta name="keywords" content="amazon cashflow software pricing, marketplace cash flow management plans, amazon seller subscription" />
        <link rel="canonical" href="https://aurenapp.com/pricing" />
      </Helmet>

      {/* Navigation */}
      <nav className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-glow-pulse" />
                <img src={aurenIcon} alt="Auren - Amazon Cash Flow Forecasting Software" className="relative h-12 w-12 hover-scale transition-all duration-300" />
              </div>
              <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Auren
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/features" onClick={() => window.scrollTo(0, 0)} className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Features
              </Link>
              <Link to="/pricing" className="text-foreground font-semibold transition-all duration-300">
                Pricing
              </Link>
              <Link to="/#testimonials" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Reviews
              </Link>
              <Link to="/blog" onClick={() => window.scrollTo(0, 0)} className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Blog
              </Link>
              <Link to="/partners" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Partners
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Contact
              </Link>
              <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Docs
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover-scale transition-all duration-200"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="hover-scale transition-all duration-200 border-primary/20 hover:border-primary/40" 
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-primary hover-scale transition-all duration-200"
                onClick={() => navigate('/signup')}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h1 className="text-4xl lg:text-5xl font-bold">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your Amazon business
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 bg-muted/50 backdrop-blur-sm border rounded-lg p-4 max-w-md mx-auto">
              <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isYearly ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-md transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
                Yearly
              </span>
              <Badge className="bg-gradient-primary">Save up to 20% ($178/year)</Badge>
            </div>
            <Badge variant="secondary" className="text-sm">
              7-day free trial • Secure checkout • Cancel anytime
            </Badge>
          </div>
          
          <div className="max-w-7xl mx-auto">
            <Card className="overflow-hidden">
              {/* Plan Headers */}
              <div className="grid grid-cols-5 gap-0 border-b">
                <div className="p-4 bg-muted/30"></div>
                {pricingPlans.map((plan, index) => (
                  <div 
                    key={index} 
                    className={`p-4 border-l ${plan.popular ? 'bg-primary/5 relative' : 'bg-background'}`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0">
                        <Badge className="bg-gradient-primary text-primary-foreground rounded-none w-full rounded-t-lg text-xs py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <div className={`text-center space-y-3 ${plan.popular ? 'mt-6' : ''}`}>
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold">{isYearly ? plan.yearlyPrice : plan.price}</span>
                          <span className="text-muted-foreground text-xs">/month</span>
                        </div>
                        {isYearly && plan.savings && (
                          <p className="text-xs text-muted-foreground">
                            Billed annually at {plan.yearlyPrice === "$24" ? "$290" : plan.yearlyPrice === "$49" ? "$590" : plan.yearlyPrice === "$74" ? "$890" : ""}/yr
                          </p>
                        )}
                        {isYearly && plan.savings && (
                          <Badge variant="secondary" className="text-xs py-0.5 px-2">
                            Save {plan.savings}/year
                          </Badge>
                        )}
                      </div>
                      <Button 
                        className={`w-full text-sm py-2 h-auto ${plan.popular ? 'bg-gradient-primary' : ''}`}
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleStartTrial(isYearly ? plan.yearlyPriceId : plan.priceId)}
                        disabled={isLoading}
                      >
                        {isLoading ? "Loading..." : plan.name === "Enterprise" ? "Customize Plan" : "Start Trial"}
                      </Button>
                      {plan.name !== "Enterprise" && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          No credit card required
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature Comparison */}
              <CardContent className="p-0">
                <div className="divide-y">
                  {featureComparison.map((row, index) => (
                    <div key={index} className="grid grid-cols-5 gap-0 hover:bg-muted/30 transition-colors">
                      <div className="p-3 font-medium text-sm bg-muted/30 flex items-center gap-2">
                        {row.signature && <Star className="h-4 w-4 fill-primary text-primary" />}
                        {row.feature}
                      </div>
                      <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[0].popular ? 'bg-primary/5' : ''}`}>
                        {row.starter === true ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : row.starter === false ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <span className="text-sm font-medium">{row.starter}</span>
                        )}
                      </div>
                      <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[1].popular ? 'bg-primary/5' : ''}`}>
                        {row.growing === true ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : row.growing === false ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <span className="text-sm font-medium">{row.growing}</span>
                        )}
                      </div>
                      <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[2].popular ? 'bg-primary/5' : ''}`}>
                        {row.professional === true ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : row.professional === false ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <span className="text-sm font-medium">{row.professional}</span>
                        )}
                      </div>
                      <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[3].popular ? 'bg-primary/5' : ''}`}>
                        {row.enterprise === true ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : row.enterprise === false ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <span className="text-sm font-medium">{row.enterprise}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bottom Info */}
            <div className="text-center mt-6 space-y-2">
              <p className="text-sm font-medium">
                No per-user fees. Cancel anytime.
              </p>
              <p className="text-sm text-muted-foreground">
                Then {isYearly ? 'yearly' : 'monthly'} billing. Cancel anytime during your 7-day free trial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={aurenIcon} alt="Auren" className="h-10 w-10" />
                <span className="text-xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Auren
                </span>
              </Link>
              <p className="text-muted-foreground">
                The cash flow management solution built specifically for Amazon sellers. Forecast payouts, track expenses, and grow with confidence.
              </p>
              <div className="flex gap-4 pt-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                  <a href="https://twitter.com/aurenapp" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                  <a href="https://linkedin.com/company/aurenapp" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/features" className="hover:text-foreground transition-colors">All Features</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link to="/docs/getting-started" className="hover:text-foreground transition-colors">Getting Started</Link></li>
                <li><Link to="/docs/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/support" className="hover:text-foreground transition-colors">Support</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="mailto:support@aurenapp.com" className="hover:text-foreground transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; 2025 Auren. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Read-Only Access</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Enterprise Customizer Modal */}
      <Dialog open={showEnterpriseCustomizer} onOpenChange={setShowEnterpriseCustomizer}>
        <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Enterprise Plan Builder
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Configure your custom enterprise solution
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Billing Frequency Toggle */}
          <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-muted/50 border border-primary/10">
            <span className={`text-xs font-medium transition-colors ${!isYearly ? 'text-primary' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 bg-primary/20 rounded-full transition-all hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-gradient-primary rounded-full shadow-lg transition-transform duration-300 ${
                  isYearly ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`text-xs font-medium transition-colors ${isYearly ? 'text-primary' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            {isYearly ? (
              <Badge variant="default" className="ml-2 bg-gradient-primary animate-pulse text-xs">
                Save 17%
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 border-primary/30 text-primary text-xs">
                Save 17% yearly
              </Badge>
            )}
          </div>

          <div className="grid gap-3 py-2">
            {/* Revenue Tier */}
            <div className="space-y-1.5 p-3 rounded-lg border border-primary/10 bg-card/50 hover:border-primary/30 transition-colors">
              <label htmlFor="tier" className="text-xs font-semibold flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Revenue Tier
              </label>
              <Select value={enterpriseTier} onValueChange={(value) => setEnterpriseTier(value as "tier1" | "tier2" | "tier3")}>
                <SelectTrigger className="w-full bg-background/50 border-primary/20 h-9">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent className="bg-background border-primary/20 z-50">
                  <SelectItem value="tier1">$200k - $500k</SelectItem>
                  <SelectItem value="tier2">$500k - $1M</SelectItem>
                  <SelectItem value="tier3">$1M+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-primary/10" />

            {/* Add-ons Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Included in Base Plan</span>
              </div>

              {/* Included Items */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{enterpriseTiers[enterpriseTier].connections}</p>
                    <p className="text-[10px] text-muted-foreground">Financial Connections</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">{enterpriseTiers[enterpriseTier].amazon}</p>
                    <p className="text-[10px] text-muted-foreground">Amazon Stores</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">{enterpriseTiers[enterpriseTier].users}</p>
                    <p className="text-[10px] text-muted-foreground">Team Users</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Additional Add-ons</span>
              </div>

              {/* Bank Connections */}
              <div className="space-y-1.5 p-3 rounded-lg border border-primary/10 bg-card/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <label htmlFor="bankConnections" className="text-xs font-medium">
                    Bank Connections
                  </label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +${addonPricing.bankConnection}/{isYearly ? 'yr' : 'mo'}
                  </Badge>
                </div>
                <Select value={enterpriseAddons.bankConnections.toString()} onValueChange={(value) => setEnterpriseAddons({ ...enterpriseAddons, bankConnections: parseInt(value) })}>
                  <SelectTrigger className="w-full bg-background/50 border-primary/20 h-9">
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20 z-50">
                    {[...Array(11)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i} {i > 0 && `(+$${i * addonPricing.bankConnection * (isYearly ? 10 : 1)})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amazon Connections */}
              <div className="space-y-1.5 p-3 rounded-lg border border-primary/10 bg-card/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <label htmlFor="amazonConnections" className="text-xs font-medium">
                    Amazon Connections
                  </label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +${addonPricing.amazonConnection}/{isYearly ? 'yr' : 'mo'}
                  </Badge>
                </div>
                <Select value={enterpriseAddons.amazonConnections.toString()} onValueChange={(value) => setEnterpriseAddons({ ...enterpriseAddons, amazonConnections: parseInt(value) })}>
                  <SelectTrigger className="w-full bg-background/50 border-primary/20 h-9">
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20 z-50">
                    {[...Array(11)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i} {i > 0 && `(+$${i * addonPricing.amazonConnection * (isYearly ? 10 : 1)})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users */}
              <div className="space-y-1.5 p-3 rounded-lg border border-primary/10 bg-card/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <label htmlFor="users" className="text-xs font-medium">
                    Additional Users
                  </label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +${addonPricing.user}/{isYearly ? 'yr' : 'mo'}
                  </Badge>
                </div>
                <Select value={enterpriseAddons.users.toString()} onValueChange={(value) => setEnterpriseAddons({ ...enterpriseAddons, users: parseInt(value) })}>
                  <SelectTrigger className="w-full bg-background/50 border-primary/20 h-9">
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20 z-50">
                    {[...Array(11)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i} {i > 0 && `(+$${i * addonPricing.user * (isYearly ? 10 : 1)})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Total Price Display */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Price</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {enterpriseTiers[enterpriseTier].revenue} tier
                </p>
              </div>
              <div className="text-right">
                {isYearly ? (
                  <>
                    <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      ${Math.round(calculateEnterprisePrice() / 12).toLocaleString()}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${calculateEnterprisePrice().toLocaleString()} billed annually
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      ${calculateEnterprisePrice().toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      per month
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button 
              variant="outline" 
              onClick={() => setShowEnterpriseCustomizer(false)}
              className="flex-1 border-primary/20 hover:bg-primary/5 h-9"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowEnterpriseCustomizer(false);
                navigate("/signup");
              }}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg h-9"
            >
              Start Free Trial
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
