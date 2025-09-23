import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Zap, Users, ArrowRight, ShoppingCart, CreditCard, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
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
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-time Sync",
      description: "Connect directly to your bank accounts and get real-time balance updates every hour.",
    },
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "For new Amazon sellers (0-$9k revenue/month)",
      features: [
        "1 Amazon account",
        "Basic payout forecasting", 
        "1 bank integration",
        "Additional accounts: $50/month each",
        "Additional banks: $10/month each",
        "Email support",
      ],
      popular: false,
    },
    {
      name: "Starter",
      price: "$39",
      period: "/month",
      description: "For growing sellers ($10k-$50k revenue/month)",
      features: [
        "1 Amazon account",
        "Advanced forecasting & scenarios",
        "1 bank integration",
        "Additional accounts: $50/month each",
        "Additional banks: $10/month each",
        "Priority email support",
        "Team collaboration (up to 2 users)",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "For established sellers ($51k-$99k revenue/month)",
      features: [
        "1 Amazon account",
        "Advanced forecasting & scenarios",
        "3 bank integrations included",
        "Additional accounts: $50/month each",
        "Additional banks: $10/month each",
        "Priority support",
        "Team collaboration (up to 5 users)",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Scale",
      price: "$149",
      period: "/month",
      description: "For scaling businesses ($100k-$199k revenue/month)",
      features: [
        "2 Amazon accounts included",
        "Advanced analytics & reporting",
        "5 bank integrations included",
        "Additional accounts: $50/month each",
        "Additional banks: $10/month each",
        "Priority phone support",
        "Team collaboration (up to 10 users)",
        "API access",
        "Dedicated account manager",
      ],
      popular: false,
    },
    {
      name: "Enterprise",
      price: "$279",
      period: "/month",
      description: "For large operations ($200k+ revenue/month)",
      features: [
        "2 Amazon accounts included",
        "5 bank integrations included",
        "White-label solution",
        "Dedicated account manager",
        "Custom reporting & analytics",
        "Advanced integrations",
        "Unlimited team members",
        "24/7 phone support",
        "Custom SLA",
      ],
      popular: false,
    },
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
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                CashFlow Pro
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Reviews
              </a>
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button size="sm" className="bg-gradient-primary" onClick={() => navigate('/auth')}>
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative mx-auto px-4">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="inline-flex items-center space-x-2">
              <Star className="h-4 w-4 fill-current" />
              <span>Trusted by 1,000+ Amazon Sellers</span>
            </Badge>
            
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Cash Flow Management
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Built for Amazon Sellers
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Forecast your Amazon cash flow months in advance. Get accurate payout predictions, 
              optimize your credit utilization, and never run out of cash for inventory again.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-gradient-primary text-lg px-8" onClick={() => navigate('/auth')}>
                Start 7-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8">
                See Live Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
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
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`shadow-card hover:shadow-elevated transition-all duration-300 ${plan.popular ? 'ring-2 ring-primary shadow-elevated scale-105' : ''}`}>
                <CardHeader className="text-center space-y-4">
                  {plan.popular && (
                    <Badge className="bg-gradient-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-gradient-primary' : ''}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => plan.name === "Enterprise" ? null : navigate('/auth')}
                  >
                    {plan.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
                  </Button>
                </CardContent>
              </Card>
            ))}
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
            Join thousands of successful Amazon sellers who trust CashFlow Pro 
            to manage their finances and scale their businesses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Start Your Free Trial
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
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
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
    </div>
  );
};

export default Landing;