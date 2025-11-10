import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Zap, Users, ArrowRight, ShoppingCart, CreditCard, Calendar, Sparkles, Check, X, Plus, Minus, Moon, Sun, ExternalLink, Lock, AlertCircle, BookOpen, Calculator, BadgeCheck, Lightbulb, Wallet, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import aurenIcon from "@/assets/auren-icon-blue.png";
import aurenFullLogo from "@/assets/auren-full-logo.png";
import amazonPartnerBadge from "@/assets/amazon-partner-badge.png";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";
import dashboardPreview from "@/assets/dashboard-preview-enhanced.png";
import { useNavigate, Link } from "react-router-dom";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/hooks/useAuth";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
const Landing = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    amazonPayouts
  } = useAmazonPayouts();
  const {
    forecastsEnabled
  } = useUserSettings();
  const [isYearly, setIsYearly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnterpriseCustomizer, setShowEnterpriseCustomizer] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  // Calculate forecast stats
  const forecastStats = (() => {
    if (!user || !forecastsEnabled) return null;
    const forecasted = amazonPayouts.filter(p => p.status === 'forecasted');
    if (forecasted.length === 0) return null;
    const totalForecasted = forecasted.reduce((sum, p) => sum + p.total_amount, 0);
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];
    const next7DaysTotal = forecasted.filter(p => p.payout_date <= next7DaysStr).reduce((sum, p) => sum + p.total_amount, 0);
    return {
      totalForecasted,
      next7DaysTotal,
      forecastCount: forecasted.length
    };
  })();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
    const addonCost = enterpriseAddons.bankConnections * addonPricing.bankConnection * multiplier + enterpriseAddons.amazonConnections * addonPricing.amazonConnection * multiplier + enterpriseAddons.users * addonPricing.user * multiplier;
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
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();

      // If not logged in, redirect to signup to create account first
      if (!session) {
        navigate("/signup");
        return;
      }

      // If logged in, redirect to dashboard (they already have trial access)
      navigate("/dashboard");
      toast.success("Welcome! Your trial has started.");
    } catch (error) {
      console.error("Error starting trial:", error);
      toast.error("Failed to start trial. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const features = [{
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Automated Cash Flow Forecasting",
    description: "Predict sales trends, payouts, and expenses based on real-time marketplace data."
  }, {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Payout Tracking & Reconciliation",
    description: "See every Amazon disbursement, track fees, and reconcile transactions automatically."
  }, {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: "Smart Purchase Planning",
    description: "Add projections and search by amount or date to find the perfect buying opportunities based on your cash flow."
  }, {
    icon: <BadgeCheck className="h-6 w-6" />,
    title: "Financial Insights Dashboard",
    description: "View profit margins, cash balances, and historical trends across SKUs and marketplaces."
  }, {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Accounting-Ready Exports",
    description: "Generate clean financial summaries or export data directly for your bookkeeping software."
  }, {
    icon: <Calculator className="h-6 w-6" />,
    title: "Performance Analytics",
    description: "Analyze your growth trajectory and plan smarter inventory or funding decisions."
  }, {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI-Powered Insights",
    description: "Get personalized daily recommendations powered by AI to optimize your cash flow and inventory decisions."
  }];
  const pricingPlans = [{
    name: "Starter",
    price: "$29",
    yearlyPrice: "$24",
    period: "/month",
    yearlyPeriod: "/month",
    description: "Up to $10k monthly payout",
    popular: false,
    priceId: "price_1SEH8NB28kMY3UseBj2w9HgH",
    yearlyPriceId: "price_1SEHZGB28kMY3UseCkWIlnWw",
    savings: "$58"
  }, {
    name: "Growing",
    price: "$59",
    yearlyPrice: "$49",
    period: "/month",
    yearlyPeriod: "/month",
    description: "Up to $50k monthly payout",
    popular: true,
    priceId: "price_1SEH8iB28kMY3Usem3k3vElT",
    yearlyPriceId: "price_1SEHZVB28kMY3Use9bH8xPlg",
    savings: "$118"
  }, {
    name: "Professional",
    price: "$89",
    yearlyPrice: "$74",
    period: "/month",
    yearlyPeriod: "/month",
    description: "Up to $100k monthly payout",
    popular: false,
    priceId: "price_1SEHBHB28kMY3UsenQEY0qoT",
    yearlyPriceId: "price_1SEHZfB28kMY3UseZKmLEcPk",
    savings: "$178"
  }, {
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
  }];
  const featureComparison = [{
    feature: "✨ Smart Purchase Planning",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "✨ Safe Spending Power",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "✨ Buying Opportunity Projection",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "✨ Payout Forecasting",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "Bank/Credit Card Connections",
    starter: "2",
    growing: "3",
    professional: "4",
    enterprise: "5 + add-ons"
  }, {
    feature: "Amazon Connections",
    starter: "1",
    growing: "1",
    professional: "1",
    enterprise: "2 + add-ons"
  }, {
    feature: "Additional Users",
    starter: false,
    growing: "2",
    professional: "5",
    enterprise: "7 + add-ons"
  }, {
    feature: "Advanced Forecasting Workflow",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "90-Day Cash Flow Projection",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "Bank Transaction Matching",
    starter: true,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "✨ Ai Insights",
    starter: false,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "✨ Ai PDF Extractor",
    starter: false,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "Document Storage",
    starter: false,
    growing: true,
    professional: true,
    enterprise: true
  }, {
    feature: "Scenario Planning",
    starter: false,
    growing: false,
    professional: true,
    enterprise: true
  }, {
    feature: "Analytics",
    starter: false,
    growing: "Basic",
    professional: "Advanced",
    enterprise: "Custom"
  }, {
    feature: "1:1 Hands-on Setup",
    starter: false,
    growing: false,
    professional: false,
    enterprise: true
  }, {
    feature: "Dedicated Account Manager",
    starter: false,
    growing: false,
    professional: false,
    enterprise: true
  }, {
    feature: "Support",
    starter: "Email",
    growing: "Priority",
    professional: "Priority",
    enterprise: "24/7 Phone"
  }];
  const testimonials = [{
    name: "Sarah Chen",
    role: "7-Figure Amazon Seller",
    content: "Finally, a cash flow tool that understands Amazon's unique payout schedule. Saved me from stockouts during Q4!",
    rating: 5
  }, {
    name: "Mike Rodriguez",
    role: "Multi-Channel Seller",
    content: "Managing 5 different marketplaces used to be a nightmare. Now I can see everything in one dashboard.",
    rating: 5
  }, {
    name: "Jennifer Wu",
    role: "Private Label Brand Owner",
    content: "The credit optimization feature helped me free up $50k in working capital for inventory purchases.",
    rating: 5
  }];
  const blogPosts = [{
    title: "How to Forecast Amazon Payouts with Accuracy",
    description: "Learn data-driven methods to predict your next disbursement and avoid cashflow issues.",
    link: "/blog/forecast-amazon-payouts",
    category: "Forecasting"
  }, {
    title: "5 Cashflow Mistakes Every Amazon Seller Should Avoid",
    description: "Stop losing liquidity due to payout delays — manage cashflow like a pro.",
    link: "/blog/manage-cashflow",
    category: "Strategy"
  }, {
    title: "Best Cashflow Tools for Marketplace Sellers",
    description: "Compare the top financial tools that help Amazon and multi-channel sellers stay profitable.",
    link: "/blog/best-cashflow-tools",
    category: "Tools"
  }];
  return <div className="min-h-screen bg-background">
      <Helmet>
        <title>Amazon Cashflow Software | Auren - Marketplace Cash Flow Management</title>
        <meta name="description" content="Automate your Amazon cash flow management with Auren — forecast payouts, track expenses, and scale confidently. All-in-one marketplace cashflow software." />
        <meta name="keywords" content="amazon cashflow software, amazon cash flow software, amazon cashflow management, amazon cash flow management, amazon cashflow management software, amazon cash flow management software, marketplace cashflow software, marketplace cash flow software, marketplace cashflow management, marketplace cash flow management, marketplace cashflow management software, marketplace cash flow management software, FBA cashflow tool, amazon seller finance software" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href="https://aurenapp.com/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Amazon Cashflow Software | Auren - Marketplace Cash Flow Management" />
        <meta property="og:description" content="Automate your Amazon cash flow management with Auren — forecast payouts, track expenses, and scale confidently." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aurenapp.com/" />
        <meta property="og:image" content="https://aurenapp.com/auren-full-logo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Auren" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Amazon Cashflow Software | Auren" />
        <meta name="twitter:description" content="Automate your Amazon cash flow management with Auren — forecast payouts, track expenses, and scale confidently." />
        <meta name="twitter:image" content="https://aurenapp.com/auren-full-logo.png" />
        
        {/* Additional SEO */}
        <meta name="author" content="Auren" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Organization Schema with Logo */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Auren",
            "alternateName": "Auren App",
            "url": "https://aurenapp.com",
            "logo": {
              "@type": "ImageObject",
              "url": "https://aurenapp.com/auren-full-logo.png",
              "width": 600,
              "height": 200
            },
            "description": "Amazon cashflow management software and marketplace cash flow management tool for sellers",
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "support@aurenapp.com",
              "contactType": "Customer Support",
              "availableLanguage": "English"
            },
            "sameAs": [
              "https://twitter.com/aurenapp",
              "https://www.linkedin.com/company/aurenapp"
            ]
          }
        `}</script>
        
        {/* SoftwareApplication Schema */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Auren",
            "alternateName": "Auren Amazon Cashflow Management Software",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "description": "Amazon cashflow management software for marketplace sellers. Forecast Amazon payouts, manage marketplace cash flow, and prevent cashflow gaps with AI-powered forecasting.",
            "url": "https://aurenapp.com",
            "image": "https://aurenapp.com/auren-full-logo.png",
            "offers": {
              "@type": "AggregateOffer",
              "lowPrice": "24",
              "highPrice": "499",
              "priceCurrency": "USD",
              "priceValidUntil": "2026-12-31"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "128",
              "bestRating": "5"
            },
            "featureList": ["Amazon cashflow forecasting", "Marketplace cash flow management", "Payout prediction", "Expense tracking", "Credit optimization", "Multi-marketplace support", "AI-powered insights"]
          }
        `}</script>
        
        {/* WebSite Schema */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Auren - Amazon Cashflow Software",
            "alternateName": "Auren Marketplace Cashflow Management Software",
            "url": "https://aurenapp.com",
            "description": "Amazon cashflow management software and marketplace cash flow management tool",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://aurenapp.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        `}</script>
      </Helmet>

      {/* Sticky CTA */}
      {showStickyCTA && <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg animate-slide-up">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-semibold">Get clarity before your next Amazon payout</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">No credit card required</span>
              </div>
            </div>
            <Button onClick={() => handleStartTrial(pricingPlans[1].priceId)} className="bg-gradient-primary whitespace-nowrap" disabled={isLoading}>
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>}

      {/* Navigation */}
      <nav className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-glow-pulse" />
                <img src={aurenIcon} alt="Auren - Amazon Cash Flow Forecasting Software" className="relative h-12 w-12 hover-scale transition-all duration-300" />
              </div>
              <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Auren
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/features" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Features
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Pricing
              </Link>
              <a href="#testimonials" onClick={e => {
              e.preventDefault();
              document.getElementById('testimonials')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }} className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Reviews
              </a>
              <a href="/blog" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Blog
              </a>
              <Link to="/partners" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Partners
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Contact
              </Link>
              <a href="/docs" className="text-muted-foreground hover:text-foreground transition-all duration-300 story-link font-medium">
                Docs
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground transition-all duration-300 font-medium gap-1">
                    Coming Soon
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/inventory" className="cursor-pointer">
                      Inventory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/reimbursements" className="cursor-pointer">
                      Reimbursements
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/advanced-analytics" className="cursor-pointer">
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/accounting" className="cursor-pointer">
                      Accounting
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/platforms" className="cursor-pointer">
                      Walmart, Shopify & More
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="hover-scale transition-all duration-200">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button variant="outline" size="sm" className="hover-scale transition-all duration-200 border-primary/20 hover:border-primary/40" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button size="sm" className="bg-gradient-primary hover-scale transition-all duration-200 hover:shadow-lg hover:shadow-primary/50" onClick={() => document.getElementById('pricing')?.scrollIntoView({
              behavior: 'smooth'
            })}>
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-4 pb-12 lg:pt-6 lg:pb-16">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] animate-float" style={{
          animationDelay: '2s',
          animationDuration: '8s'
        }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-glow/20 rounded-full blur-[80px] animate-glow-pulse" />
        </div>
        
        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />
        
        <div className="container relative mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 z-10">
              <div className="animate-fade-in space-y-6" style={{
              animationDelay: '200ms'
            }}>
                <div className="flex items-start gap-4">
                  <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display font-bold leading-relaxed tracking-tight flex-1">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-foreground">Smarter</span>
                      <div className="flex flex-col gap-2">
                        <Badge className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover-scale whitespace-nowrap" style={{
                        wordSpacing: '0.3em'
                      }}>
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          <span className="font-display">Mathematical Rule-Based</span>
                          <span className="ml-2 px-2.5 py-0.5 bg-primary/20 rounded-full text-xs">Accurate</span>
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pb-2">
                      <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
                        Cash Flow Forecasting
                      </span>
                      <Badge variant="secondary" className="text-base px-4 py-2 whitespace-nowrap font-semibold tracking-wide">
                        Starting at only $24/mo
                      </Badge>
                    </div>
                    <span className="block text-foreground pb-2">for Amazon Sellers</span>
                  </h1>
                </div>
              </div>
              
              <p className="text-xl text-muted-foreground max-w-xl animate-fade-in leading-relaxed" style={{
              animationDelay: '400ms'
            }}>Auren forecasts 90-day precise Amazon payout forecast based on your amazon data, tracks every purchase order, recurring expense, credit card payment, and additional income to provide you your cashflow for the next 3 months.</p>
              
              <p className="text-base text-muted-foreground/90 max-w-xl animate-fade-in leading-relaxed" style={{
              animationDelay: '500ms'
            }}>How it works - Search by budget (“I want to spend $X”) and Auren tells you the exact date you can spend it, or search by date (“I need to buy inventory on this day”) and Auren shows how much you can safely spend aligned with all of your expenses and additional i</p>
              
              <div className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in" style={{
              animationDelay: '600ms'
            }}>
                <Button size="lg" className="group relative bg-gradient-primary text-white text-base px-8 py-7 text-lg font-semibold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-1" onClick={() => handleStartTrial(pricingPlans[1].priceId)} disabled={isLoading}>
                  <span className="relative z-10">{isLoading ? "Loading..." : "Start Free Trial - No Card Required"}</span>
                  <ArrowRight className="relative z-10 ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <div className="flex flex-col sm:hidden text-xs text-muted-foreground">
                  <span>✓ No credit card required</span>
                  <span>✓ Cancel anytime</span>
                </div>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4 animate-fade-in" style={{
              animationDelay: '800ms'
            }}>
                <div className="flex items-center gap-2 text-sm">
                <div className="flex -space-x-1">
                  <img src={avatar1} alt="Amazon FBA seller using Auren for cash flow forecasting" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                  <img src={avatar2} alt="Marketplace seller managing finances with Auren" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                  <img src={avatar3} alt="eCommerce seller tracking Amazon payouts" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                  <img src={avatar4} alt="Online seller forecasting cash flow with Auren" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                </div>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">500+</span> sellers trust Auren
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                  <span className="ml-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4.9</span>/5 rating
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">No credit card required</span>
                </div>
              </div>
              
              {/* Security Badge */}
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 animate-fade-in" style={{
              animationDelay: '1000ms'
            }}>
                <Lock className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Bank-grade security</span>
                  <span className="text-border">•</span>
                  <span>Read-only access</span>
                  <span className="text-border">•</span>
                  <span>SOC 2 compliant</span>
                </div>
              </div>

              {/* Live Forecast Stats - Only show when logged in with forecasts enabled */}
              {forecastStats && <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
                  <div className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Your Active Forecasts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">${forecastStats.totalForecasted.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Forecasted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">${forecastStats.next7DaysTotal.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Next 7 Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{forecastStats.forecastCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">Forecasts</div>
                    </div>
                  </div>
                </div>}
            </div>

            {/* Right Video Preview */}
            <div className="relative animate-fade-in space-y-6" style={{
            animationDelay: '400ms'
          }}>
              {/* Signature Features Highlights */}
              <div className="relative bg-card/50 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-sm font-semibold text-primary">✨ See Signature Features in Video Below</span>
                </div>
                
                {/* Amazon Partner Badge - Bottom Right Corner */}
                <a href="https://sellercentral.amazon.com/selling-partner-appstore/dp/amzn1.sp.solution.da3e84d1-5ad4-4667-941b-e2727cdfd92c" target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 transition-all duration-300 hover:scale-105 hover:shadow-lg z-10">
                  <img src={amazonPartnerBadge} alt="Amazon Selling Partner Software Partner" className="h-24 w-auto opacity-80 hover:opacity-100 transition-opacity" />
                </a>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Smart Purchase Planning</div>
                      <div className="text-xs text-muted-foreground">Intelligent recommendations for optimal inventory purchases</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Safe Spending Power</div>
                      <div className="text-xs text-muted-foreground">Know exactly how much you can safely spend</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Buying Opportunity Projection</div>
                      <div className="text-xs text-muted-foreground">Forecast future purchasing windows and opportunities</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-info" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Amazon Payout Forecasting</div>
                      <div className="text-xs text-muted-foreground">Predict upcoming Amazon payouts with precision</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="relative scale-110 transition-transform duration-700 ease-out hover:scale-[1.15]">
                {/* Glow effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl" />
                
                {/* Image card */}
                <div className="relative rounded-2xl border-2 border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <img 
                    src={dashboardPreview} 
                    alt="Auren Dashboard Preview - Cash Flow Visualization and Safe Spending Power" 
                    className="w-full h-auto will-change-transform"
                    style={{ 
                      imageRendering: '-webkit-optimize-contrast',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden',
                      WebkitFontSmoothing: 'subpixel-antialiased'
                    }}
                  />
                </div>
              </div>
              
              {/* Video Stats - Outside the card */}
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

      {/* Safe Spending Power & Opportunities Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center space-y-4 mb-16">
            <Badge className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Signature Features
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Know Exactly How Much You Can Safely Spend
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our AI-powered Safe Spending Power and Buying Opportunities features give you confidence in every purchasing decision
            </p>
          </div>

          {/* Safe Spending Power Card */}
          <div className="max-w-6xl mx-auto mb-16">
            <Card className="shadow-2xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 bg-gradient-to-br from-card via-card to-primary/5">
              <CardHeader className="space-y-4 pb-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                        <Shield className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold">Safe Spending Power</CardTitle>
                        <p className="text-muted-foreground">Your financial safety net, calculated in real-time</p>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 px-4 py-2 text-sm font-bold">
                    LIVE VERIFIED
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Visual representation */}
                <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
                        <CheckCircle className="h-6 w-6" />
                        What It Does
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Safe Spending Power analyzes your entire financial picture—bank accounts, upcoming income, scheduled expenses, and obligations—to calculate exactly how much you can spend <span className="font-bold text-foreground">without risking cash shortfalls</span>.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Analyzes all connected bank accounts in real-time</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Factors in upcoming Amazon payouts and income</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Accounts for all pending expenses and obligations</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Includes customizable reserve buffer for peace of mind</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
                        <Zap className="h-6 w-6" />
                        Why It Matters
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-card/50 border border-border">
                          <p className="font-semibold text-foreground mb-2">Never Overdraft Again</p>
                          <p className="text-sm text-muted-foreground">Know your true available balance after all obligations are met</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 border border-border">
                          <p className="font-semibold text-foreground mb-2">Make Confident Purchases</p>
                          <p className="text-sm text-muted-foreground">Buy inventory without worrying about upcoming expenses</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 border border-border">
                          <p className="font-semibold text-foreground mb-2">Avoid Late Fees</p>
                          <p className="text-sm text-muted-foreground">Ensure you always have cash for bills and credit card payments</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Calculation */}
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Example Calculation
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Current Bank Balance</span>
                        <span className="font-bold text-lg">$45,000</span>
                      </div>
                      <div className="flex justify-between items-center text-success">
                        <span className="text-muted-foreground">+ Expected Income (7 days)</span>
                        <span className="font-bold">$28,500</span>
                      </div>
                      <div className="flex justify-between items-center text-destructive">
                        <span className="text-muted-foreground">- Scheduled Expenses</span>
                        <span className="font-bold">$22,300</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>- Reserve Buffer (10%)</span>
                        <span className="font-bold">$4,500</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-emerald-700">Safe to Spend</span>
                        <span className="text-3xl font-bold text-emerald-600">$46,700</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30">
                      <div className="text-center space-y-2">
                        <BadgeCheck className="h-16 w-16 text-emerald-600 mx-auto" />
                        <p className="text-sm font-bold text-emerald-700">VERIFIED IN REAL-TIME</p>
                        <p className="text-xs text-muted-foreground">Updated every time your<br />finances change</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Buying Opportunities Card */}
          <div className="max-w-6xl mx-auto">
            <Card className="shadow-2xl border-2 border-accent/20 hover:border-accent/40 transition-all duration-500 bg-gradient-to-br from-card via-card to-accent/5">
              <CardHeader className="space-y-4 pb-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold">View Buying Opportunities</CardTitle>
                        <p className="text-muted-foreground">AI-powered insights for optimal purchase timing</p>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 px-4 py-2 text-sm font-bold">
                    AI-POWERED
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Visual representation */}
                <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
                        <Sparkles className="h-6 w-6" />
                        What It Shows
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Buying Opportunities identifies <span className="font-bold text-foreground">future dates when you'll have extra cash</span> available after all obligations are met. It shows you the perfect windows to make large inventory purchases or investments.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Forecasts cash surpluses up to 90 days ahead</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Shows exact available amount on each opportunity date</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Accounts for seasonal patterns and recurring expenses</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">Helps plan Q4 inventory builds and growth investments</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6" />
                        How Sellers Use It
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-card/50 border border-border">
                          <p className="font-semibold text-foreground mb-2">Plan Inventory Purchases</p>
                          <p className="text-sm text-muted-foreground">"I can buy $50k of inventory on Oct 15th without hurting cash flow"</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 border border-border">
                          <p className="font-semibold text-foreground mb-2">Time Growth Investments</p>
                          <p className="text-sm text-muted-foreground">"Perfect time to invest in new product line or marketing campaign"</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 border border-border">
                          <p className="font-semibold text-foreground mb-2">Negotiate Better Deals</p>
                          <p className="text-sm text-muted-foreground">"Knowing my cash windows helps me negotiate payment terms with suppliers"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Opportunities Timeline */}
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Example: Your Next Buying Opportunities
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 hover:bg-blue-500/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-700">October 15, 2025</span>
                        <Badge className="bg-blue-500/20 text-blue-700">In 6 days</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Available to invest</span>
                        <span className="text-2xl font-bold text-blue-600">$52,400</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">After your Amazon payout and before credit card payment</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 hover:bg-blue-500/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-700">October 28, 2025</span>
                        <Badge className="bg-blue-500/20 text-blue-700">In 19 days</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Available to invest</span>
                        <span className="text-2xl font-bold text-blue-600">$68,200</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Peak opportunity - Multiple payouts align with low expenses</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 hover:bg-blue-500/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-700">November 12, 2025</span>
                        <Badge className="bg-blue-500/20 text-blue-700">In 34 days</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Available to invest</span>
                        <span className="text-2xl font-bold text-blue-600">$45,800</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Good for Q4 inventory build-up before holiday rush</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span>Automatically updated as your finances change</span>
                  </div>
                </div>

                {/* CTA within card */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/30 text-center space-y-4">
                  <p className="text-lg font-semibold">Ready to see YOUR buying opportunities?</p>
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => handleStartTrial(pricingPlans[1].priceId)}>
                    Start Free 7-Day Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground">No credit card required • See your opportunities in minutes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16 space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">These Features Work Together</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Safe Spending Power tells you what you can spend today. Buying Opportunities shows you when you'll have extra cash in the future. Together, they give you complete control over your business finances.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Real-time updates</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Mathematical forecasting</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Bank-grade security</span>
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

      {/* Key Features Showcase Section */}
      <section className="relative py-16 bg-gradient-to-b from-background via-primary/5 to-background overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <Badge className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Powerful Planning Tools
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold">
              Make Smarter Financial Decisions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Auren's intelligent features help you plan purchases, avoid cash shortfalls, and seize growth opportunities at the perfect time.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1: Project Purchase Orders */}
            <Card className="relative group hover:shadow-2xl transition-all duration-300 border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Project Purchase Orders</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground">
                  Simulate future purchase orders and instantly see their impact on your cash flow. Plan inventory investments with confidence.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>See real-time "safe to spend" amounts after adding POs</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Identify your low point dates and earliest purchase windows</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Avoid cash gaps by planning around your payout schedule</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                    <Lightbulb className="h-4 w-4" />
                    Perfect for inventory planning and supplier negotiations
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2: Search by Date */}
            <Card className="relative group hover:shadow-2xl transition-all duration-300 border-accent/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Search Buying Opportunities by Date</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground">
                  Pick any future date and discover exactly how much you can safely spend that day. Know your purchasing power in advance.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>View available spending power for any date within 3 months</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Get "Ready to Purchase" alerts when cash is available</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Plan around supplier payment deadlines confidently</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm text-accent font-semibold">
                    <TrendingUp className="h-4 w-4" />
                    Coordinate purchases with expected payout dates
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature 3: Search by Amount */}
            <Card className="relative group hover:shadow-2xl transition-all duration-300 border-success/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-success/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Search Buying Opportunities by Amount</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground">
                  Enter the purchase amount you need to make and find out exactly when you can afford it. Never miss growth opportunities.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Input any purchase amount and get exact affordability dates</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>See your low point date assuming zero spending until then</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Make data-driven decisions on major inventory investments</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm text-success font-semibold">
                    <Wallet className="h-4 w-4" />
                    Time large purchases perfectly with your cash flow cycle
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <Button size="lg" className="bg-gradient-primary text-white px-8 py-6 text-lg font-semibold hover:shadow-xl transition-all" onClick={() => handleStartTrial(pricingPlans[1].priceId)} disabled={isLoading}>
              Start Using These Features Today - Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              7-day free trial • No credit card required • Full access to all features
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Smarter Cash Flow Forecasting with Built-In Financial Accuracy
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Auren helps Amazon sellers predict upcoming payouts, manage expenses, and stay in control of cash flow — all without spreadsheets. Our forecasting engine combines analytics, accounting precision, and real-time Amazon data to give you the clearest picture of your business finances.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in" style={{
            animationDelay: `${index * 100}ms`
          }}>
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
              </Card>)}
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
                    <h3 className="font-semibold text-center text-primary font-display">Auren</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="font-semibold text-center text-muted-foreground">Other Tools</h3>
                  </div>
                </div>
                
                {[["Amazon Payout Forecasting", "✓ Accurate to the day", "✗ Generic forecasting"], ["Multi-Marketplace Support", "✓ All Amazon regions", "✗ Limited support"], ["Credit Optimization", "✓ Built for sellers", "✗ Generic advice"], ["Seasonal Planning", "✓ Q4 inventory builds", "✗ Basic planning"], ["Setup Time", "✓ 5 minutes", "✗ Hours of setup"], ["Amazon-Specific Support", "✓ Expert team", "✗ Generic support"]].map(([feature, pro, other], index) => <div key={index} className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-t">
                    <div className="p-4">
                      <span className="font-medium">{feature}</span>
                    </div>
                    <div className="p-4 bg-primary/5">
                      <span className="text-success font-medium">{pro}</span>
                    </div>
                    <div className="p-4">
                      <span className="text-muted-foreground">{other}</span>
                    </div>
                  </div>)}
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
              <button onClick={() => setIsYearly(!isYearly)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isYearly ? 'bg-primary' : 'bg-border'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-md transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-1'}`} />
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
                  {pricingPlans.map((plan, index) => <div key={index} className={`p-4 border-l ${plan.popular ? 'bg-primary/5 relative' : 'bg-background'}`}>
                      {plan.popular && <div className="absolute top-0 left-0 right-0">
                          <Badge className="bg-gradient-primary text-primary-foreground rounded-none w-full rounded-t-lg text-xs py-1">
                            Most Popular
                          </Badge>
                        </div>}
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
                          {isYearly && plan.savings && <p className="text-xs text-muted-foreground">
                              Billed annually at {plan.yearlyPrice === "$24" ? "$290" : plan.yearlyPrice === "$49" ? "$590" : plan.yearlyPrice === "$74" ? "$890" : ""}/yr
                            </p>}
                          {isYearly && plan.savings && <Badge variant="secondary" className="text-xs py-0.5 px-2">
                              Save {plan.savings}/year
                            </Badge>}
                        </div>
                        <Button className={`w-full text-sm py-2 h-auto ${plan.popular ? 'bg-gradient-primary' : ''}`} variant={plan.popular ? "default" : "outline"} onClick={() => handleStartTrial(isYearly ? plan.yearlyPriceId : plan.priceId)} disabled={isLoading}>
                          {isLoading ? "Loading..." : plan.name === "Enterprise" ? "Customize Plan" : "Start Trial"}
                        </Button>
                        {plan.name !== "Enterprise" && <p className="text-xs text-muted-foreground text-center mt-2">
                            No credit card required
                          </p>}
                      </div>
                    </div>)}
                </div>

                {/* Feature Comparison Table - Connected */}
                <CardContent className="p-0">
                  <div className="divide-y">
                    {featureComparison.map((row, index) => <div key={index} className="grid grid-cols-5 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-3 font-medium text-sm bg-muted/30 flex items-center">{row.feature}</div>
                        <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[0].popular ? 'bg-primary/5' : ''}`}>
                          {row.starter === true ? <Check className="h-4 w-4 text-success" /> : row.starter === false ? <X className="h-4 w-4 text-destructive" /> : <span className="text-sm font-medium">{row.starter}</span>}
                        </div>
                        <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[1].popular ? 'bg-primary/5' : ''}`}>
                          {row.growing === true ? <Check className="h-4 w-4 text-success" /> : row.growing === false ? <X className="h-4 w-4 text-destructive" /> : <span className="text-sm font-medium">{row.growing}</span>}
                        </div>
                        <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[2].popular ? 'bg-primary/5' : ''}`}>
                          {row.professional === true ? <Check className="h-4 w-4 text-success" /> : row.professional === false ? <X className="h-4 w-4 text-destructive" /> : <span className="text-sm font-medium">{row.professional}</span>}
                        </div>
                        <div className={`p-3 border-l flex items-center justify-center ${pricingPlans[3].popular ? 'bg-primary/5' : ''}`}>
                          {row.enterprise === true ? <Check className="h-4 w-4 text-success" /> : row.enterprise === false ? <X className="h-4 w-4 text-destructive" /> : <span className="text-sm font-medium">{row.enterprise}</span>}
                        </div>
                      </div>)}
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
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />)}
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
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />)}
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
            {blogPosts.map((post, index) => <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer" onClick={() => navigate(post.link)}>
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
              </Card>)}
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
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    Auren uses mathematical modeling based on Amazon's actual settlement mechanics to forecast your payouts with precision.
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <h4 className="font-semibold text-sm mb-3">Our Methodology</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>Order-Level Analysis:</strong></p>
                      <p className="pl-4">Calculates net revenue per order accounting for fees, costs, returns, and chargebacks</p>
                      
                      <p className="mt-3"><strong>Reserve Modeling:</strong></p>
                      <p className="pl-4">Models Amazon's reserve holds based on delivery timing and historical patterns</p>
                      
                      <p className="mt-3"><strong>Settlement Forecasting:</strong></p>
                      <p className="pl-4">Projects future payouts using proprietary algorithms and your settlement history</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Key Features:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                      <li>Auto-detects your settlement schedule (bi-weekly or daily withdrawals)</li>
                      <li>Tracks deliveries through Amazon's reserve period</li>
                      <li>Accounts for returns, fees, and adjustment patterns</li>
                      <li>Adjustable safety buffers for conservative or aggressive forecasting</li>
                      <li>Real-time accuracy tracking as settlements arrive</li>
                    </ul>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic">
                    Note: Forecast accuracy depends on settlement consistency. Accounts under review may experience longer reserve holds.
                  </p>
                </div>
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
                <CardTitle>Yes! The default is one account however you can purchase additional accounts as a add-on. So you can manage different brands or marketplaces in one dashboard.</CardTitle>
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
                <CardTitle>What features are coming next?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We're continuously expanding Auren's capabilities. Coming soon:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>Auren Inventory</strong> - Smart restock management with AI-powered forecasting and low stock alerts</li>
                  <li><strong>Reimbursement Tracker</strong> - Automatically identify and claim FBA reimbursements from Amazon</li>
                  <li><strong>Walmart & Shopify</strong> - Multi-platform cash flow tracking</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>What happens after my free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  A plan will be recommended based on your revenue. There are no hidden fees or surprise charges, and you can cancel anytime.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>How accurate is the Amazon payout forecasting?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">Auren uses real settlement data to forecast payouts with 95% accuracy. We pull data directly from your seller account for the most precise and accurate forecast.</p>
              </CardContent>
            </Card>
          </div>
          
          {/* FAQ Schema Markup */}
          <script type="application/ld+json">{`
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How does Auren forecast my Amazon payouts?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Auren uses your Amazon Seller Central data to project upcoming payouts based on settlement trends and reserve patterns. You'll know exactly when and how much to expect."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I connect multiple seller accounts?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! Growth and Pro plans allow multiple Amazon accounts, so you can manage different brands or marketplaces in one dashboard."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is my data secure?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolutely. Auren connects via read-only API access and stores data using bank-grade AES-256 encryption. You can delete your data or disconnect anytime."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Does Auren work with Walmart or Shopify?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Walmart and Shopify integrations are coming soon! Join the waitlist to get early access when they launch."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What happens after my free trial?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "You can continue with your chosen plan. There are no hidden fees or surprise charges, and you can cancel anytime."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How accurate is the Amazon payout forecasting?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Auren uses real settlement data to forecast payouts with 95% accuracy. Our AI models continuously learn from your sales patterns to provide increasingly precise predictions."
                  }
                }
              ]
            }
          `}</script>
        </div>
      </section>

      {/* SEO Content Section */}
      <section id="learn" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
              Master Amazon Seller Cash Flow Management
            </h2>
            
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <h3 className="text-2xl font-bold text-foreground">Why Amazon Cash Flow Forecasting Matters</h3>
              <p className="leading-relaxed">
                Managing cash flow as an <strong className="text-foreground">Amazon seller</strong> can feel unpredictable — payouts come on Amazon&apos;s schedule, not yours.
                Between advertising costs, supplier invoices, and marketplace fees, it&apos;s easy to lose track of when money is actually available.
                Understanding your <strong className="text-foreground">Amazon payout schedule</strong> and <strong className="text-foreground">FBA financial planning</strong> is crucial for sustainable growth.
              </p>

              <h3 className="text-2xl font-bold text-foreground">How Auren Solves Cash Flow Challenges for Marketplace Sellers</h3>
              <p className="leading-relaxed">
                <strong className="text-foreground">Auren</strong> was built specifically to solve the <strong className="text-foreground">cash flow management challenges</strong> faced by Amazon FBA and marketplace sellers. By connecting directly to your <a href="/docs/amazon-integration" className="text-primary hover:underline">Amazon Seller Central account</a>,
                Auren forecasts every future payout using your real settlement data. Our AI-powered system maps sales, refunds, reserves, and fees to
                generate a clear <strong className="text-foreground">90-day cash flow timeline</strong> — helping you understand exactly when funds will hit your bank and when your next big expense is due.
              </p>

              <h3 className="text-2xl font-bold text-foreground">Scale Your Amazon Business with Predictable Cash Flow</h3>
              <p className="leading-relaxed">
                Predictable cash flow isn&apos;t just about avoiding overdrafts — it&apos;s about <strong className="text-foreground">unlocking sustainable growth</strong>. With accurate <strong className="text-foreground">Amazon payout forecasting</strong>,
                sellers can confidently plan new inventory orders, time product launches, and scale advertising budgets without worrying about short-term liquidity.
                Instead of reacting to cash flow surprises, you can make proactive financial decisions that keep your eCommerce business growing sustainably. Learn more about <a href="/features" className="text-primary hover:underline">all our forecasting features</a>.
              </p>

              <h3 className="text-2xl font-bold text-foreground">Advanced Features for Amazon FBA & Multi-Channel Sellers</h3>
              <p className="leading-relaxed">
                Whether you&apos;re an FBA wholesaler, private-label brand, or multi-marketplace seller, Auren&apos;s <strong className="text-foreground">cash flow forecasting dashboard</strong>
                shows your <em className="text-foreground">daily available cash</em> and <em className="text-foreground">expected Amazon payouts</em> at a glance. You can even run <a href="/features/scenario-planning" className="text-primary hover:underline">what-if scenarios</a>
                to test how changes in sales volume, ad spend, or restocks affect your future cash position. Our <strong className="text-foreground">AI-powered insights</strong> help you optimize spending and maximize profitability.
              </p>

              <h3 className="text-2xl font-bold text-foreground">Replace Spreadsheets with Automated Cash Flow Tracking</h3>
              <p className="leading-relaxed">
                By automating your <strong className="text-foreground">seller cash flow tracking</strong>, Auren helps you replace complex spreadsheets with clarity and confidence. Our platform integrates with
                your bank accounts, credit cards, and Amazon seller accounts to provide real-time visibility into your financial health.
                Join hundreds of sellers using Auren to take control of their finances, prevent cash gaps,
                and scale confidently on Amazon and beyond. Start your <Link to="/pricing" className="text-primary hover:underline">free 7-day trial</Link> today — no credit card required.
              </p>
            </div>

            <div className="flex justify-center pt-8">
              <Button size="lg" className="bg-gradient-primary text-lg px-8" onClick={() => handleStartTrial(pricingPlans[0].priceId)} disabled={isLoading}>
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
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => handleStartTrial(pricingPlans[0].priceId)} disabled={isLoading}>
              {isLoading ? "Loading..." : "Start Your Free Trial"}
              <ArrowRight className="ml-2 h-5 w-5" />
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
          <div className="grid gap-8 md:grid-cols-5">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                  <img src={aurenIcon} alt="Auren - Cash Flow Management for Amazon Sellers" className="h-8 w-8" />
                </div>
                <span className="text-xl font-bold font-display">Auren</span>
              </div>
              <p className="text-muted-foreground">
                The cash flow management solution built specifically for Amazon sellers. Forecast payouts, track expenses, and grow with confidence.
              </p>
              <div className="flex gap-4 pt-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                  <a href="https://twitter.com/aurenapp" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                  <a href="https://linkedin.com/company/aurenapp" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
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
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
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
              <Button variant="outline" size="sm" onClick={() => setIsYearly(!isYearly)} className="relative h-6 w-12 rounded-full p-0">
                <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-primary transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0'}`} />
              </Button>
              <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly
                {isYearly && <span className="ml-2 text-xs text-primary font-semibold">
                    Save ${enterpriseTiers[enterpriseTier].price * 12 - enterpriseTiers[enterpriseTier].yearlyPrice}!
                  </span>}
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
                  <Button size="icon" variant="outline" onClick={() => setEnterpriseAddons(prev => ({
                  ...prev,
                  bankConnections: Math.max(0, prev.bankConnections - 1)
                }))} disabled={enterpriseAddons.bankConnections <= 0}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{enterpriseAddons.bankConnections}</span>
                  <Button size="icon" variant="outline" onClick={() => setEnterpriseAddons(prev => ({
                  ...prev,
                  bankConnections: prev.bankConnections + 1
                }))}>
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
                  <Button size="icon" variant="outline" onClick={() => setEnterpriseAddons(prev => ({
                  ...prev,
                  amazonConnections: Math.max(0, prev.amazonConnections - 1)
                }))} disabled={enterpriseAddons.amazonConnections <= 0}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{enterpriseAddons.amazonConnections}</span>
                  <Button size="icon" variant="outline" onClick={() => setEnterpriseAddons(prev => ({
                  ...prev,
                  amazonConnections: prev.amazonConnections + 1
                }))}>
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
                  <Button size="icon" variant="outline" onClick={() => setEnterpriseAddons(prev => ({
                  ...prev,
                  users: Math.max(0, prev.users - 1)
                }))} disabled={enterpriseAddons.users <= 0}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-8 text-center">{enterpriseAddons.users}</span>
                  <Button size="icon" variant="outline" onClick={() => setEnterpriseAddons(prev => ({
                  ...prev,
                  users: prev.users + 1
                }))}>
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
                {isYearly && <div className="text-xs text-primary font-semibold">
                    Save ${enterpriseTiers[enterpriseTier].price * 12 - enterpriseTiers[enterpriseTier].yearlyPrice + enterpriseAddons.bankConnections * addonPricing.bankConnection * 2 + enterpriseAddons.amazonConnections * addonPricing.amazonConnection * 2 + enterpriseAddons.users * addonPricing.user * 2} per year with annual billing!
                  </div>}
                <div className="text-xs text-muted-foreground">
                  Base: ${isYearly ? enterpriseTiers[enterpriseTier].yearlyPrice : enterpriseTiers[enterpriseTier].price} + Add-ons: ${calculateEnterprisePrice() - (isYearly ? enterpriseTiers[enterpriseTier].yearlyPrice : enterpriseTiers[enterpriseTier].price)}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button className="w-full bg-gradient-primary" size="lg" onClick={async () => {
            // Build line items: base plan + add-ons
            const lineItems = [{
              price: isYearly ? enterpriseTiers[enterpriseTier].yearlyPriceId : enterpriseTiers[enterpriseTier].priceId,
              quantity: 1
            }];

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
              const {
                data: {
                  session
                }
              } = await supabase.auth.getSession();

              // If not logged in, redirect to signup
              if (!session) {
                navigate("/signup?enterprise=true");
                setShowEnterpriseCustomizer(false);
                return;
              }

              // If logged in, redirect to dashboard
              navigate("/dashboard");
              toast.success("Welcome! Your enterprise trial has started.");
            } catch (error) {
              console.error("Error:", error);
              toast.error("Failed to start trial. Please try again.");
            } finally {
              setIsLoading(false);
            }
            setShowEnterpriseCustomizer(false);
          }} disabled={isLoading}>
              {isLoading ? "Processing..." : "Start Free Trial - No Card Required"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              No credit card required. Then ${calculateEnterprisePrice()}/{isYearly ? 'year' : 'month'}. Cancel anytime during your 7-day free trial.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating AI Chat Widget */}
      <FloatingChatWidget />
    </div>;
};
export default Landing;