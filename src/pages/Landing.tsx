import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Zap, Users, ArrowRight, ShoppingCart, CreditCard, Calendar, DollarSign, Sparkles, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LiveDashboardShowcase } from "@/components/LiveDashboardShowcase";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async (priceId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-guest-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Daily AI Financial Insights",
      description: "Get personalized daily recommendations powered by AI. Chat with your financial advisor anytime to ask questions about your cash flow.",
    },
    {
      icon: <ShoppingCart className="h-6 w-6" />,
      title: "Amazon Payout Forecasting",
      description: "Predict your bi-weekly payouts, reserve releases, and fee adjustments with 95% accuracy.",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Credit Optimization for Sellers",
      description: "Maximize your credit utilization across cards while maintaining cash flow for inventory purchases.",
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Seasonal Planning",
      description: "Plan for Q4 inventory builds, promotional periods, and seasonal cash flow fluctuations.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Multi-Marketplace Support",
      description: "Track payouts from Amazon US, UK, EU, and other marketplaces in one unified dashboard.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Inventory Financing Tracking",
      description: "Monitor loan payments, credit lines, and inventory-backed financing all in one place.",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      yearlyPrice: "$290",
      period: "/month",
      yearlyPeriod: "/year",
      description: "Under $20k monthly amazon payout",
      popular: false,
      priceId: "price_1SEH8NB28kMY3UseBj2w9HgH",
      yearlyPriceId: "price_1SEHZGB28kMY3UseCkWIlnWw",
      savings: "$58"
    },
    {
      name: "Growing",
      price: "$59",
      yearlyPrice: "$590",
      period: "/month",
      yearlyPeriod: "/year",
      description: "Under $50k monthly amazon payout",
      popular: true,
      priceId: "price_1SEH8iB28kMY3Usem3k3vElT",
      yearlyPriceId: "price_1SEHZVB28kMY3Use9bH8xPlg",
      savings: "$118"
    },
    {
      name: "Professional",
      price: "$89",
      yearlyPrice: "$890",
      period: "/month",
      yearlyPeriod: "/year",
      description: "Under $200k monthly amazon payout",
      popular: false,
      priceId: "price_1SEHBHB28kMY3UsenQEY0qoT",
      yearlyPriceId: "price_1SEHZfB28kMY3UseZKmLEcPk",
      savings: "$178"
    },
  ];

  const featureComparison = [
    { feature: "Bank/Credit Card Connections", starter: "2", growing: "4", professional: "7" },
    { feature: "Amazon Connections", starter: "1", growing: "1", professional: "1" },
    { feature: "Additional Users", starter: false, growing: "2", professional: "5" },
    { feature: "Advanced Forecasting Workflow", starter: true, growing: true, professional: true },
    { feature: "365-Day Cash Flow Projection", starter: true, growing: true, professional: true },
    { feature: "Bank Transaction Matching", starter: true, growing: true, professional: true },
    { feature: "AI Insights", starter: false, growing: true, professional: true },
    { feature: "AI PDF Extractor", starter: false, growing: true, professional: true },
    { feature: "Automated Notifications", starter: false, growing: false, professional: true },
    { feature: "Scenario Planning", starter: false, growing: false, professional: true },
    { feature: "Analytics", starter: false, growing: "Basic", professional: "Advanced" },
    { feature: "Support", starter: "Email", growing: "Priority", professional: "Priority" },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "7-Figure Amazon Seller",
      content: "Finally, a cash flow tool that understands Amazon's unique payout schedule. Saved me from stockouts during Q4!",
      rating: 5,
    },
    {
      name: "Mike Rodriguez",
      role: "Multi-Channel Seller",
      content: "Managing 5 different marketplaces used to be a nightmare. Now I can see everything in one dashboard.",
      rating: 5,
    },
    {
      name: "Jennifer Wu",
      role: "Private Label Brand Owner",
      content: "The credit optimization feature helped me free up $50k in working capital for inventory purchases.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 animate-scale-in">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center hover-scale transition-all duration-300 hover:rotate-12">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
                CashFlow Pro
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link">
                Plans
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link">
                Reviews
              </a>
              <a href="/docs" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link">
                Docs
              </a>
              <Button variant="outline" size="sm" className="hover-scale transition-all duration-200" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button size="sm" className="bg-gradient-primary hover-scale transition-all duration-200" onClick={() => navigate('/auth')}>
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse opacity-20" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse opacity-30" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse opacity-10" style={{ animationDelay: '2s' }} />
        </div>

        {/* Floating Dashboard Cards - Left */}
        <div className="hidden lg:block absolute left-10 top-32 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <Card className="w-72 shadow-2xl rotate-[-6deg] hover:rotate-[-3deg] transition-transform duration-500 bg-card/80 backdrop-blur-md border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Revenue Overview</CardTitle>
                <Badge variant="secondary" className="text-xs">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">$25,056.55</div>
                  <div className="text-xs text-muted-foreground mt-1">Oct 15 - $45,863</div>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={[
                    { value: 35000 }, { value: 38000 }, { value: 42000 }, 
                    { value: 39000 }, { value: 45000 }, { value: 43000 }, { value: 45863 }
                  ]}>
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating Dashboard Cards - Right Top */}
        <div className="hidden lg:block absolute right-10 top-28 animate-fade-in" style={{ animationDelay: '800ms' }}>
          <Card className="w-64 shadow-2xl rotate-[6deg] hover:rotate-[3deg] transition-transform duration-500 bg-card/80 backdrop-blur-md border-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total active users</div>
                  <div className="text-2xl font-bold">120K+</div>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-primary border-2 border-background" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating Dashboard Cards - Right Bottom */}
        <div className="hidden lg:block absolute right-16 bottom-32 animate-fade-in" style={{ animationDelay: '1000ms' }}>
          <Card className="w-56 shadow-2xl rotate-[-4deg] hover:rotate-[-2deg] transition-transform duration-500 bg-card/80 backdrop-blur-md border-2">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Physical Item</div>
                  <div className="text-2xl font-bold text-success flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    7,830
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Digital Item</div>
                  <div className="text-2xl font-bold text-primary flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    4,540
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="container relative mx-auto px-4">
          <div className="text-center space-y-8">
            {/* New Smart AI Features Badge */}
            <Badge className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 text-sm font-semibold animate-fade-in">
              <span>New</span>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>Smart AI Features</span>
            </Badge>
            
            <div className="animate-fade-in space-y-6" style={{ animationDelay: '400ms' }}>
              <h1 className="text-4xl lg:text-7xl font-bold leading-tight">
                <span className="inline-block hover:scale-105 transition-transform duration-300">
                  <span className="bg-gradient-primary bg-clip-text text-transparent animate-pulse">AI-Powered</span> Cash Flow
                </span>
                <span className="block bg-gradient-primary bg-clip-text text-transparent">
                  Built for Amazon Sellers
                </span>
              </h1>
            </div>
            
            <p 
              className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in leading-relaxed" 
              style={{ animationDelay: '600ms' }}
            >
              Get daily AI insights, forecast your Amazon cash flow months in advance, and optimize your credit utilization. 
              Never run out of cash for inventory again with intelligent financial recommendations.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in" 
              style={{ animationDelay: '800ms' }}
            >
              <Button 
                size="lg" 
                className="bg-gradient-primary text-lg px-8 py-4 hover-scale transition-all duration-300 hover:shadow-lg hover:shadow-primary/25" 
                onClick={() => handleStartTrial(pricingPlans[1].priceId)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Start 7-Day Free Trial"}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 hover-scale transition-all duration-300 hover:bg-primary/5 hover:border-primary/30" 
                onClick={() => navigate('/demo')}
              >
                See Live Demo
              </Button>
            </div>

            <Badge 
              variant="secondary" 
              className="inline-flex items-center space-x-2 animate-fade-in hover-scale transition-all duration-300 hover:bg-primary/10"
              style={{ animationDelay: '900ms' }}
            >
              <Star className="h-4 w-4 fill-current" />
              <span>Trusted by 1,000+ Amazon Sellers</span>
            </Badge>
            
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in" 
              style={{ animationDelay: '1000ms' }}
            >
              <div className="flex items-center space-x-2 hover-scale transition-all duration-300 hover:text-success">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center space-x-2 hover-scale transition-all duration-300 hover:text-success">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center space-x-2 hover-scale transition-all duration-300 hover:text-success">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Dashboard Showcase Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <LiveDashboardShowcase />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Why Amazon Sellers Choose CashFlow Pro
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Generic cash flow tools don't understand Amazon's unique challenges. 
              We're built specifically for your business model.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              CashFlow Pro vs. Generic Tools
            </h2>
            <p className="text-xl text-muted-foreground">
              See why Amazon sellers are switching from Cash Flow Frog and QuickBooks
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-elevated">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                  <div className="p-6 space-y-4">
                    <h3 className="font-semibold text-center">Feature</h3>
                  </div>
                  <div className="p-6 space-y-4 bg-primary/5">
                    <h3 className="font-semibold text-center text-primary">CashFlow Pro</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="font-semibold text-center text-muted-foreground">Other Tools</h3>
                  </div>
                </div>
                
                {[
                  ["Amazon Payout Forecasting", "✓ Accurate to the day", "✗ Generic forecasting"],
                  ["Multi-Marketplace Support", "✓ All Amazon regions", "✗ Limited support"],
                  ["Credit Optimization", "✓ Built for sellers", "✗ Generic advice"],
                  ["Seasonal Planning", "✓ Q4 inventory builds", "✗ Basic planning"],
                  ["Setup Time", "✓ 5 minutes", "✗ Hours of setup"],
                  ["Amazon-Specific Support", "✓ Expert team", "✗ Generic support"],
                ].map(([feature, pro, other], index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-t">
                    <div className="p-4">
                      <span className="font-medium">{feature}</span>
                    </div>
                    <div className="p-4 bg-primary/5">
                      <span className="text-success font-medium">{pro}</span>
                    </div>
                    <div className="p-4">
                      <span className="text-muted-foreground">{other}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Simple, Transparent Pricing
            </h2>
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
            {/* Integrated Plan Cards with Comparison */}
            <Card className="overflow-hidden">
              {/* Plan Headers with Pricing */}
              <div className="grid grid-cols-4 gap-0 border-b">
                <div className="p-6 bg-muted/30"></div>
                {pricingPlans.map((plan, index) => (
                  <div 
                    key={index} 
                    className={`p-6 border-l ${plan.popular ? 'bg-primary/5 relative' : 'bg-background'}`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0">
                        <Badge className="bg-gradient-primary text-primary-foreground rounded-none w-full rounded-t-lg">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <div className={`text-center space-y-4 ${plan.popular ? 'mt-6' : ''}`}>
                      <div>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">{isYearly ? plan.yearlyPrice : plan.price}</span>
                          <span className="text-muted-foreground text-sm">{isYearly ? plan.yearlyPeriod : plan.period}</span>
                        </div>
                        {isYearly && (
                          <Badge variant="secondary" className="text-xs">
                            Save {plan.savings}/year
                          </Badge>
                        )}
                      </div>
                      <Button 
                        className={`w-full ${plan.popular ? 'bg-gradient-primary' : ''}`}
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleStartTrial(isYearly ? plan.yearlyPriceId : plan.priceId)}
                        disabled={isLoading}
                      >
                        {isLoading ? "Loading..." : "Start Trial"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature Comparison Table - Connected */}
              <CardContent className="p-0">
                <div className="divide-y">
                  {featureComparison.map((row, index) => (
                    <div key={index} className="grid grid-cols-4 gap-0 hover:bg-muted/30 transition-colors">
                      <div className="p-4 font-medium text-sm bg-muted/30 flex items-center">{row.feature}</div>
                      <div className={`p-4 border-l flex items-center justify-center ${pricingPlans[0].popular ? 'bg-primary/5' : ''}`}>
                        {row.starter === true ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : row.starter === false ? (
                          <X className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <span className="text-sm font-medium">{row.starter}</span>
                        )}
                      </div>
                      <div className={`p-4 border-l flex items-center justify-center ${pricingPlans[1].popular ? 'bg-primary/5' : ''}`}>
                        {row.growing === true ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : row.growing === false ? (
                          <X className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <span className="text-sm font-medium">{row.growing}</span>
                        )}
                      </div>
                      <div className={`p-4 border-l flex items-center justify-center ${pricingPlans[2].popular ? 'bg-primary/5' : ''}`}>
                        {row.professional === true ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : row.professional === false ? (
                          <X className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <span className="text-sm font-medium">{row.professional}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bottom CTA */}
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground">
                Then {isYearly ? 'yearly' : 'monthly'} billing. Cancel anytime during your 7-day free trial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Loved by Amazon Sellers
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our customers are saying
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="flex space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Ready to Master Your Amazon Cash Flow?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Start your 7-day free trial today. Credit card required, but you won't be charged until your trial ends. 
            Join thousands of successful Amazon sellers who trust CashFlow Pro to manage their finances and scale their businesses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8" 
              onClick={() => handleStartTrial(pricingPlans[1].priceId)}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Start Your Free Trial"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Schedule Demo
            </Button>
          </div>
          <p className="text-sm opacity-75">
            7-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">CashFlow Pro</span>
              </div>
              <p className="text-muted-foreground">
                The cash flow management solution built specifically for Amazon sellers.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Plans</a></li>
                <li><a href="#" className="hover:text-foreground">API</a></li>
                <li><a href="#" className="hover:text-foreground">Integrations</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground">Status</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 CashFlow Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating AI Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
};

export default Landing;