import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Zap, Users, ArrowRight, ShoppingCart, CreditCard, Calendar, Sparkles, Check, X, Plus, Minus, Moon, Sun, ExternalLink, Lock, AlertCircle, BookOpen } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";
import aurenFullLogo from "@/assets/auren-full-logo.png";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";
import { useNavigate, Link } from "react-router-dom";
import { LiveDashboardShowcase } from "@/components/LiveDashboardShowcase";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnterpriseCustomizer, setShowEnterpriseCustomizer] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Track scroll for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
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
    const multiplier = isYearly ? 10 : 1; // Yearly addon prices are 10 months worth
    const addonCost = 
      (enterpriseAddons.bankConnections * addonPricing.bankConnection * multiplier) +
      (enterpriseAddons.amazonConnections * addonPricing.amazonConnection * multiplier) +
      (enterpriseAddons.users * addonPricing.user * multiplier);
    return basePrice + addonCost;
  };

  const handleStartTrial = async (priceId: string) => {
    setIsLoading(true);
    try {
      // Handle Enterprise plan - open customizer
      if (priceId === "enterprise") {
        setShowEnterpriseCustomizer(true);
        setIsLoading(false);
        return;
      }

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
      description: "Up to $20k monthly revenue",
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
      description: "Up to $100k monthly revenue",
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
    { feature: "Bank/Credit Card Connections", starter: "2", growing: "3", professional: "4", enterprise: "5 + add-ons" },
    { feature: "Amazon Connections", starter: "1", growing: "1", professional: "1", enterprise: "2 + add-ons" },
    { feature: "Additional Users", starter: false, growing: "2", professional: "5", enterprise: "7 + add-ons" },
    { feature: "Advanced Forecasting Workflow", starter: true, growing: true, professional: true, enterprise: true },
    { feature: "365-Day Cash Flow Projection", starter: true, growing: true, professional: true, enterprise: true },
    { feature: "Bank Transaction Matching", starter: true, growing: true, professional: true, enterprise: true },
    { feature: "✨ Ai Insights", starter: false, growing: true, professional: true, enterprise: true },
    { feature: "✨ Ai PDF Extractor", starter: false, growing: true, professional: true, enterprise: true },
    { feature: "Automated Notifications", starter: false, growing: false, professional: true, enterprise: true },
    { feature: "Scenario Planning", starter: false, growing: false, professional: true, enterprise: true },
    { feature: "Analytics", starter: false, growing: "Basic", professional: "Advanced", enterprise: "Custom" },
    { feature: "1:1 Hands-on Setup", starter: false, growing: false, professional: false, enterprise: true },
    { feature: "Dedicated Account Manager", starter: false, growing: false, professional: false, enterprise: true },
    { feature: "Support", starter: "Email", growing: "Priority", professional: "Priority", enterprise: "24/7 Phone" },
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

  const blogPosts = [
    {
      title: "How to Forecast Amazon Payouts with Accuracy",
      description: "Learn data-driven methods to predict your next disbursement and avoid cashflow issues.",
      link: "/blog/forecast-amazon-payouts",
      category: "Forecasting"
    },
    {
      title: "5 Cashflow Mistakes Every Amazon Seller Should Avoid",
      description: "Stop losing liquidity due to payout delays — manage cashflow like a pro.",
      link: "/blog/manage-cashflow",
      category: "Strategy"
    },
    {
      title: "Best Cashflow Tools for Marketplace Sellers",
      description: "Compare the top financial tools that help Amazon and multi-channel sellers stay profitable.",
      link: "/blog/best-cashflow-tools",
      category: "Tools"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Auren - Cash Flow Forecasting for Amazon Sellers | Predict Payouts & Manage Finances</title>
        <meta name="description" content="Forecast Amazon payouts, track expenses, and avoid cash shortfalls with Auren. AI-powered insights, 365-day projections, and real-time dashboards for marketplace sellers." />
        <link rel="canonical" href="https://aurenapp.com" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Auren - Cash Flow Forecasting for Amazon Sellers" />
        <meta property="og:description" content="Predict Amazon payouts and manage seller cash flow with 95% accuracy. Start your free trial today." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aurenapp.com" />
        <meta property="og:image" content="https://aurenapp.com/assets/og-image.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Auren - Cash Flow Forecasting for Amazon Sellers" />
        <meta name="twitter:description" content="Predict payouts and manage finances with AI-powered insights." />
        <meta name="twitter:image" content="https://aurenapp.com/assets/og-image.png" />
        
        {/* Schema.org */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Auren",
            "applicationCategory": "FinanceApplication",
            "offers": {
              "@type": "Offer",
              "price": "29",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "ratingCount": "127"
            }
          }
        `}</script>
      </Helmet>

      {/* Sticky CTA */}
      {showStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg animate-slide-up">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold">Get clarity before your next Amazon payout</span>
            </div>
            <Button 
              onClick={() => handleStartTrial(pricingPlans[1].priceId)}
              className="bg-gradient-primary"
              disabled={isLoading}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-glow-pulse" />
                <img src={aurenIcon} alt="Auren" className="relative h-12 w-12 hover-scale transition-all duration-300" />
              </div>
              <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Auren
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/features" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Features
              </Link>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Plans
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Reviews
              </a>
              <a href="/blog" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Blog
              </a>
              <a href="/docs" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Docs
              </a>
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
                className="bg-gradient-primary hover-scale transition-all duration-200 hover:shadow-lg hover:shadow-primary/50" 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 lg:py-16">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s', animationDuration: '8s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-glow/20 rounded-full blur-[80px] animate-glow-pulse" />
        </div>
        
        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />
        
        <div className="container relative mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 z-10">
              {/* Floating Badge */}
              <div className="animate-fade-in">
                <Badge className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover-scale">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="font-display">AI-Powered Forecasting</span>
                  <span className="ml-2 px-2 py-0.5 bg-primary/20 rounded-full text-xs">New</span>
                </Badge>
              </div>
              
              <div className="animate-fade-in space-y-6" style={{ animationDelay: '200ms' }}>
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-[1.1] tracking-tight">
                  <span className="block text-foreground">Cashflow</span>
                  <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
                    Forecasting
                  </span>
                  <span className="block text-foreground">for Marketplace</span>
                  <span className="block text-foreground">Sellers</span>
                </h1>
              </div>
              
              <p 
                className="text-xl text-muted-foreground max-w-xl animate-fade-in leading-relaxed" 
                style={{ animationDelay: '400ms' }}
              >
                Forecast Amazon payouts and expenses—all in one place. See your upcoming disbursements, loans, ads, and purchase orders perfectly aligned, so you can plan inventory and cash flow with confidence.
              </p>
              
              <div 
                className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in" 
                style={{ animationDelay: '600ms' }}
              >
                <Button 
                  size="lg" 
                  className="group relative bg-gradient-primary text-white text-base px-8 py-7 text-lg font-semibold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-1" 
                  onClick={() => handleStartTrial(pricingPlans[1].priceId)}
                  disabled={isLoading}
                >
                  <span className="relative z-10">{isLoading ? "Loading..." : "Start 7-Day Free Trial"}</span>
                  <ArrowRight className="relative z-10 ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-base px-8 py-7 text-lg font-semibold border-2 hover-scale transition-all duration-300 hover:border-primary/50 hover:bg-primary/5" 
                  onClick={() => navigate('/demo')}
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  See Live Demo
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div
                className="flex flex-wrap items-center gap-6 pt-4 animate-fade-in" 
                style={{ animationDelay: '800ms' }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex -space-x-1">
                    <img src={avatar1} alt="Seller testimonial" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                    <img src={avatar2} alt="Seller testimonial" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                    <img src={avatar3} alt="Seller testimonial" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                    <img src={avatar4} alt="Seller testimonial" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                  </div>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">500+</span> sellers trust Auren
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4.9</span>/5 rating
                  </span>
                </div>
              </div>
              
              {/* Security Badge */}
              <div 
                className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 animate-fade-in" 
                style={{ animationDelay: '1000ms' }}
              >
                <Lock className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Bank-grade security</span>
                  <span className="text-border">•</span>
                  <span>Read-only access</span>
                  <span className="text-border">•</span>
                  <span>SOC 2 compliant</span>
                </div>
              </div>
            </div>

            {/* Right Dashboard Preview */}
            <div 
              className="relative animate-fade-in"
              style={{ animationDelay: '400ms' }}
            >
              {/* Floating Card Effect */}
              <div className="relative animate-float">
                {/* Glow effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl animate-glow-pulse" />
                
                {/* Dashboard preview card */}
                <div className="relative rounded-3xl border-2 border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden group hover:border-primary/40 transition-all duration-500">
                  {/* Browser chrome */}
                  <div className="p-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 mx-4 px-4 py-1 bg-background/50 rounded-lg">
                      <div className="text-xs text-muted-foreground font-mono">aurenapp.com/dashboard</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded bg-muted/50" />
                      <div className="w-6 h-6 rounded bg-muted/50" />
                    </div>
                  </div>
                  
                  {/* Dashboard screenshot/iframe */}
                  <div className="relative overflow-hidden flex items-center justify-center bg-background/50" style={{ aspectRatio: '16/10' }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <iframe
                        src="/demo"
                        className="w-full h-full border-0 cursor-pointer"
                        style={{ 
                          transform: 'scale(0.35)',
                          transformOrigin: 'center center',
                          width: '285.71%',
                          height: '285.71%',
                          minWidth: '1920px'
                        }}
                        title="Demo Dashboard Preview"
                        onClick={() => navigate('/demo')}
                      />
                    </div>
                    
                    {/* Try Me Pointer */}
                    <div className="absolute top-6 right-6 flex items-start gap-2 animate-float pointer-events-none">
                      <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full shadow-lg border border-primary/20">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">Try Interactive Demo</span>
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>👆</div>
                    </div>
                    
                    {/* Fade gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-card/80 via-card/40 to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Floating stats */}
                <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-primary/20 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                  <div className="text-sm text-muted-foreground">Next Payout</div>
                  <div className="text-2xl font-bold text-success">$12,847</div>
                  <div className="text-xs text-muted-foreground">in 3 days</div>
                </div>

                <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-accent/20 shadow-lg animate-float" style={{ animationDelay: '2s', animationDuration: '7s' }}>
                  <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
                  <div className="text-2xl font-bold text-primary">95.8%</div>
                  <div className="flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="h-3 w-3" />
                    <span>+2.3% this month</span>
                  </div>
                </div>
              </div>
              
              {/* Dashboard Stats - Outside the card */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">Real-time</div>
                  <div className="text-xs text-muted-foreground">Data Updates</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">Interactive</div>
                  <div className="text-xs text-muted-foreground">Interface</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">Responsive</div>
                  <div className="text-xs text-muted-foreground">Design</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 bg-muted/50 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-6">
            <p className="text-sm text-muted-foreground font-semibold">USED BY 7- AND 8-FIGURE SELLERS</p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm italic">"Finally know my next Amazon payout date"</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm italic">"Spotted cash gaps weeks ahead"</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm italic">"Never miss inventory buys anymore"</p>
              </div>
            </div>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-5 w-5" />
                <span className="text-sm font-medium">256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-medium">Read-Only Access</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">SOC 2 Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Why Amazon Sellers Choose Auren
            </h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">🔮</div>
                  <CardTitle className="text-xl">Predict Every Payout</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Auren connects securely to your Amazon Seller Central account and analyzes your settlement history to forecast upcoming payouts — date, amount, and frequency — so you know exactly when cash is coming.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">📊</div>
                  <CardTitle className="text-xl">See Your Entire Cash Timeline</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  View all inflows and outflows — sales, fees, ads, loans, inventory restocks — on a daily or weekly basis. Spot cash gaps weeks in advance and plan purchases with confidence.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">💡</div>
                  <CardTitle className="text-xl">Plan Smarter, Scale Faster</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Use Auren's intelligent projections to test new ad budgets, plan restocks, or time supplier payments without risking liquidity. Your business decisions stay backed by real data, not guesswork.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">🛡️</div>
                  <CardTitle className="text-xl">Private, Secure, and Read-Only</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  We never sell or share your data. Auren uses read-only API permissions and encrypted connections. You stay in control — disconnect anytime with one click.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              How Auren Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Setup takes less than 2 minutes. No spreadsheet uploads, no guesswork — just clarity.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Badge className="text-xl font-bold">1</Badge>
                    <CardTitle className="text-lg">Connect your Amazon account</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Securely via SP-API — no passwords required.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Badge className="text-xl font-bold">2</Badge>
                    <CardTitle className="text-lg">Sync your data</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Auren analyzes settlement and transaction history instantly.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Badge className="text-xl font-bold">3</Badge>
                    <CardTitle className="text-lg">View your forecast</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    See upcoming payouts, expenses, and available cash by day.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Badge className="text-xl font-bold">4</Badge>
                    <CardTitle className="text-lg">Plan ahead</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Make confident decisions about inventory, ads, or new launches.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Built Specifically for Amazon Sellers
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
              Auren vs. Generic Tools
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
                    <h3 className="font-semibold text-center text-primary">Auren</h3>
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
                            <span className="text-muted-foreground text-xs">{isYearly ? plan.yearlyPeriod : plan.period}</span>
                          </div>
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
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature Comparison Table - Connected */}
                <CardContent className="p-0">
                  <div className="divide-y">
                    {featureComparison.map((row, index) => (
                      <div key={index} className="grid grid-cols-5 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-3 font-medium text-sm bg-muted/30 flex items-center">{row.feature}</div>
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

              {/* Bottom CTA */}
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

      {/* Proof Section - Mini Case Study */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-elevated overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-8 bg-primary/5">
                  <h3 className="text-2xl font-bold mb-4">
                    How a $80k/mo seller cut cash crunches by 70%
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Multi-marketplace seller struggled with timing inventory orders around Amazon's bi-weekly payouts. 
                    After implementing Auren's daily forecasting, they eliminated overdrafts and optimized credit card utilization.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success"></div>
                      <span className="text-sm">Reduced cash shortfalls by 70%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success"></div>
                      <span className="text-sm">Freed up $15k in working capital</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success"></div>
                      <span className="text-sm">Never missed an inventory buy</span>
                    </div>
                  </div>
                </div>
                <div className="p-8 flex items-center justify-center bg-background">
                  <div className="text-center space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-primary">70%</div>
                      <div className="text-sm text-muted-foreground">Fewer Cash Crunches</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary">$15k</div>
                      <div className="text-sm text-muted-foreground">Capital Freed Up</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary">100%</div>
                      <div className="text-sm text-muted-foreground">Inventory Buys on Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              What Sellers Are Saying
            </h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardContent className="p-8 space-y-4">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
                  ))}
                </div>
                <p className="text-lg text-muted-foreground italic leading-relaxed">
                  "Before Auren, I never knew how much cash I'd actually have after Amazon fees. Now I can see my next payout and upcoming expenses in one view — it's a game changer."
                </p>
                <div className="border-t pt-4">
                  <p className="font-semibold">Jessica M.</p>
                  <p className="text-sm text-muted-foreground">7-figure Amazon seller</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardContent className="p-8 space-y-4">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
                  ))}
                </div>
                <p className="text-lg text-muted-foreground italic leading-relaxed">
                  "Auren replaced my Excel tracker and 4 different apps. It's the only tool that accurately predicts my Amazon balance two weeks out."
                </p>
                <div className="border-t pt-4">
                  <p className="font-semibold">Alex P.</p>
                  <p className="text-sm text-muted-foreground">FBA wholesaler</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Blog Preview Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <BookOpen className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-3xl lg:text-4xl font-bold">
              Latest Insights from Auren
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Learn proven strategies to forecast payouts, manage cashflow, and scale your Amazon business.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {blogPosts.map((post, index) => (
              <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer" onClick={() => navigate(post.link)}>
                <CardHeader>
                  <Badge variant="secondary" className="w-fit mb-2">{post.category}</Badge>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{post.description}</p>
                  <Button variant="link" className="p-0 h-auto font-semibold group-hover:translate-x-1 transition-transform">
                    Read More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <Button variant="outline" size="lg" onClick={() => navigate('/blog')}>
              View All Articles
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>How does Auren forecast my Amazon payouts?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Auren uses your Amazon Seller Central data to project upcoming payouts based on settlement trends and reserve patterns. You'll know exactly when and how much to expect.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Can I connect multiple seller accounts?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Yes! Growth and Pro plans allow multiple Amazon accounts, so you can manage different brands or marketplaces in one dashboard.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Absolutely. Auren connects via read-only API access and stores data using bank-grade AES-256 encryption. You can delete your data or disconnect anytime.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Does Auren work with Walmart or Shopify?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Walmart and Shopify integrations are coming soon! Join the waitlist to get early access when they launch.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>What happens after my free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  You can continue with your chosen plan. There are no hidden fees or surprise charges, and you can cancel anytime.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section id="learn" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
              Learn How to Master Amazon Cashflow
            </h2>
            
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <p className="leading-relaxed">
                Managing cashflow as an Amazon seller can feel unpredictable — payouts come on Amazon&apos;s schedule, not yours.
                Between advertising costs, supplier invoices, and marketplace fees, it&apos;s easy to lose track of when money is actually available.
              </p>

              <p className="leading-relaxed">
                <strong className="text-foreground">Auren</strong> was built to solve this exact problem. By connecting directly to your Amazon Seller Central account,
                Auren forecasts every future payout using your real settlement data. It maps sales, refunds, reserves, and fees to
                generate a clear cashflow timeline — helping you understand when funds will hit your bank and when your next big expense is due.
              </p>

              <p className="leading-relaxed">
                Predictable cashflow isn&apos;t just about avoiding overdrafts — it&apos;s about unlocking growth. With accurate forecasting,
                sellers can plan new inventory orders, time product launches, and scale advertising budgets without worrying about short-term liquidity.
                Instead of reacting to surprises, you can make proactive financial decisions that keep your business growing sustainably.
              </p>

              <p className="leading-relaxed">
                Whether you&apos;re an FBA wholesaler, private-label brand, or multi-marketplace seller, Auren&apos;s forecasting dashboard
                shows your <em className="text-foreground">daily available cash</em> and <em className="text-foreground">expected payouts</em> at a glance. You can even run &quot;what-if&quot; scenarios
                to test how changes in sales volume, ad spend, or restocks affect your future cash position.
              </p>

              <p className="leading-relaxed">
                By automating your cashflow tracking, Auren helps you replace spreadsheets with clarity — giving you back the time
                to focus on growth. Join hundreds of sellers using Auren to take control of their finances, prevent cash gaps,
                and scale confidently on Amazon and beyond.
              </p>
            </div>

            <div className="flex justify-center pt-8">
              <Button 
                size="lg" 
                className="bg-gradient-primary text-lg px-8"
                onClick={() => handleStartTrial(pricingPlans[0].priceId)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Start Your Free Trial"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Start Forecasting Your Cashflow Today
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join hundreds of Amazon sellers using Auren to predict payouts, plan growth, and never stress about cashflow again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8" 
              onClick={() => handleStartTrial(pricingPlans[0].priceId)}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Start Your Free Trial"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm opacity-75">
            7-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-5">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                  <img src={aurenIcon} alt="Auren" className="h-8 w-8" />
                </div>
                <span className="text-xl font-bold">Auren</span>
              </div>
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
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link to="/demo" className="hover:text-foreground transition-colors">Live Demo</Link></li>
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

      {/* Enterprise Customizer Dialog */}
      <Dialog open={showEnterpriseCustomizer} onOpenChange={setShowEnterpriseCustomizer}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Customize Your Enterprise Plan</DialogTitle>
            <DialogDescription>
              Select your revenue tier and additional features to see your custom pricing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsYearly(!isYearly)}
                className="relative h-6 w-12 rounded-full p-0"
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-primary transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </Button>
              <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly
                {isYearly && (
                  <span className="ml-2 text-xs text-primary font-semibold">
                    Save ${(enterpriseTiers[enterpriseTier].price * 12) - enterpriseTiers[enterpriseTier].yearlyPrice}!
                  </span>
                )}
              </span>
            </div>

            {/* Revenue Tier Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Monthly Revenue</label>
              <Select value={enterpriseTier} onValueChange={(value: "tier1" | "tier2" | "tier3") => setEnterpriseTier(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">$200k - $500k</SelectItem>
                  <SelectItem value="tier2">$500k - $1M</SelectItem>
                  <SelectItem value="tier3">$1M+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Base Features */}
            <div className="p-4 bg-primary/5 rounded-lg space-y-2">
              <h4 className="font-semibold">
                Included in base price (${isYearly ? enterpriseTiers[enterpriseTier].yearlyPrice : enterpriseTiers[enterpriseTier].price}/{isYearly ? 'year' : 'month'}):
              </h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {enterpriseTiers[enterpriseTier].connections} bank/credit card connections
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {enterpriseTiers[enterpriseTier].amazon} Amazon connections
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {enterpriseTiers[enterpriseTier].users} additional users
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  All Professional features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  1:1 hands-on setup with team member
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Dedicated account manager
                </li>
              </ul>
            </div>

            <Separator />

            {/* Add-ons */}
            <div className="space-y-4">
              <h4 className="font-semibold">Additional Add-ons (optional):</h4>
              
              {/* Bank Connections */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Additional Bank Connections</div>
                  <div className="text-sm text-muted-foreground">
                    ${addonPricing.bankConnection}/{isYearly ? 'year' : 'month'} each
                    {isYearly && <span className="ml-1 text-xs">(${addonPricing.bankConnection * 10}/year - 2 months free)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEnterpriseAddons(prev => ({ ...prev, bankConnections: Math.max(0, prev.bankConnections - 1) }))}
                    disabled={enterpriseAddons.bankConnections <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{enterpriseAddons.bankConnections}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEnterpriseAddons(prev => ({ ...prev, bankConnections: prev.bankConnections + 1 }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Amazon Connections */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Additional Amazon Connections</div>
                  <div className="text-sm text-muted-foreground">
                    ${addonPricing.amazonConnection}/{isYearly ? 'year' : 'month'} each
                    {isYearly && <span className="ml-1 text-xs">(${addonPricing.amazonConnection * 10}/year - 2 months free)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEnterpriseAddons(prev => ({ ...prev, amazonConnections: Math.max(0, prev.amazonConnections - 1) }))}
                    disabled={enterpriseAddons.amazonConnections <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{enterpriseAddons.amazonConnections}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEnterpriseAddons(prev => ({ ...prev, amazonConnections: prev.amazonConnections + 1 }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Additional Users */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Additional Users</div>
                  <div className="text-sm text-muted-foreground">
                    ${addonPricing.user}/{isYearly ? 'year' : 'month'} each
                    {isYearly && <span className="ml-1 text-xs">(${addonPricing.user * 10}/year - 2 months free)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEnterpriseAddons(prev => ({ ...prev, users: Math.max(0, prev.users - 1) }))}
                    disabled={enterpriseAddons.users <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{enterpriseAddons.users}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEnterpriseAddons(prev => ({ ...prev, users: prev.users + 1 }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Total Price */}
            <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">Your Custom Enterprise Price</div>
                <div className="text-5xl font-bold">
                  ${calculateEnterprisePrice()}
                  <span className="text-lg font-normal text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
                </div>
                {isYearly && (
                  <div className="text-xs text-primary font-semibold">
                    Save ${(enterpriseTiers[enterpriseTier].price * 12) - enterpriseTiers[enterpriseTier].yearlyPrice + 
                      (enterpriseAddons.bankConnections * addonPricing.bankConnection * 2) +
                      (enterpriseAddons.amazonConnections * addonPricing.amazonConnection * 2) +
                      (enterpriseAddons.users * addonPricing.user * 2)} per year with annual billing!
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Base: ${isYearly ? enterpriseTiers[enterpriseTier].yearlyPrice : enterpriseTiers[enterpriseTier].price} + Add-ons: ${calculateEnterprisePrice() - (isYearly ? enterpriseTiers[enterpriseTier].yearlyPrice : enterpriseTiers[enterpriseTier].price)}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              className="w-full bg-gradient-primary" 
              size="lg"
              onClick={async () => {
                // Build line items: base plan + add-ons
                const lineItems = [
                  {
                    price: isYearly ? enterpriseTiers[enterpriseTier].yearlyPriceId : enterpriseTiers[enterpriseTier].priceId,
                    quantity: 1
                  }
                ];

                // Add bank connection add-ons
                if (enterpriseAddons.bankConnections > 0) {
                  lineItems.push({
                    price: isYearly ? "price_1SF2TuB28kMY3Use4DiYnkp6" : "price_1SF2J6B28kMY3UseQW6ATKt1",
                    quantity: enterpriseAddons.bankConnections
                  });
                }

                // Add Amazon connection add-ons
                if (enterpriseAddons.amazonConnections > 0) {
                  lineItems.push({
                    price: isYearly ? "price_1SF2U4B28kMY3Usez8rm1I7f" : "price_1SEHQLB28kMY3UseBmY7IIjx",
                    quantity: enterpriseAddons.amazonConnections
                  });
                }

                // Add user add-ons
                if (enterpriseAddons.users > 0) {
                  lineItems.push({
                    price: isYearly ? "price_1SF2UFB28kMY3UseHmvICumx" : "price_1SEHQoB28kMY3UsedGTbBbmA",
                    quantity: enterpriseAddons.users
                  });
                }

                setIsLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("create-guest-checkout", {
                    body: { 
                      lineItems,
                      isEnterprise: true 
                    },
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
                
                setShowEnterpriseCustomizer(false);
              }}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Start 7-Day Free Trial"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Then ${calculateEnterprisePrice()}/{isYearly ? 'year' : 'month'}. Cancel anytime during your 7-day free trial.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating AI Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
};

export default Landing;