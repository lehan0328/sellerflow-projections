import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Brain,
  FileText,
  CreditCard,
  Building2,
  Users,
  Repeat,
  Wallet,
  ShoppingCart,
  MessageSquare,
  Target,
  BarChart3,
  Zap,
  Lock,
  Globe,
  DollarSign,
  ArrowRight,
  Shield,
} from "lucide-react";

const Features = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: Calendar,
      title: "Cash Flow Calendar",
      description: "Visualize your entire financial future on an interactive calendar. See exactly when money comes in and goes out.",
      category: "Core",
      badge: "Popular",
      slug: "cash-flow-calendar"
    },
    {
      icon: Target,
      title: "Scenario Planning",
      description: "Model what-if scenarios to understand how revenue changes, new expenses, or vendor terms affect your cash position.",
      category: "Planning",
      badge: "New",
      slug: "scenario-planning"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Multi-dashboard analytics covering cashflow, profitability, inventory forecasts, ad performance, and account health.",
      category: "Analytics",
      badge: "Pro",
      slug: "advanced-analytics"
    },
    {
      icon: Brain,
      title: "AI Cash Flow Insights",
      description: "Get daily AI-generated insights about your cash position, spending patterns, and optimization opportunities.",
      category: "AI",
      badge: "AI",
      slug: "ai-cash-flow-insights"
    },
    {
      icon: FileText,
      title: "AI PDF Extractor",
      description: "Upload purchase orders and invoices - our AI automatically extracts vendor details, amounts, and payment terms.",
      category: "AI",
      badge: "AI",
      slug: "ai-pdf-extractor"
    },
    {
      icon: MessageSquare,
      title: "AI Financial Assistant",
      description: "Chat with AI about your finances. Ask questions, get advice, and understand your cash flow in plain English.",
      category: "AI",
      badge: "AI",
      slug: "ai-financial-assistant"
    },
    {
      icon: ShoppingCart,
      title: "Amazon Integration",
      description: "Automatically sync Amazon payouts, orders, fees, and refunds. Support for multiple marketplaces.",
      category: "Integrations",
      badge: null,
      slug: "amazon-integration"
    },
    {
      icon: Building2,
      title: "Bank Account Sync",
      description: "Connect unlimited bank accounts via Plaid. Real-time balance updates and automatic transaction syncing.",
      category: "Integrations",
      badge: null,
      slug: "bank-account-sync"
    },
    {
      icon: CreditCard,
      title: "Credit Card Management",
      description: "Track credit utilization, payment due dates, and available credit across all your business cards.",
      category: "Core",
      badge: null,
      slug: "credit-card-management"
    },
    {
      icon: Users,
      title: "Vendor Management",
      description: "Manage all vendor relationships, payment schedules, and purchase orders in one place.",
      category: "Core",
      badge: null,
      slug: "vendor-management"
    },
    {
      icon: DollarSign,
      title: "Income Tracking",
      description: "Log one-time and recurring income. Track customer payments and manage receivables.",
      category: "Core",
      badge: null,
      slug: "income-tracking"
    },
    {
      icon: Repeat,
      title: "Recurring Expenses",
      description: "Set up subscriptions and recurring costs. Automatically project future expenses on your calendar.",
      category: "Core",
      badge: null,
      slug: "recurring-expenses"
    },
    {
      icon: Zap,
      title: "AI Transaction Matching",
      description: "AI automatically matches bank transactions to vendors, invoices, and purchase orders. Review and approve with one click to save hours of reconciliation.",
      category: "AI",
      badge: "AI",
      slug: "ai-transaction-matching"
    },
    {
      icon: TrendingUp,
      title: "AI Buying Opportunities",
      description: "AI analyzes your cash flow patterns and tells you the optimal timing for major purchases when you have available funds.",
      category: "AI",
      badge: "AI",
      slug: "ai-buying-opportunities"
    },
    {
      icon: Wallet,
      title: "Safe Spending Calculator",
      description: "Know exactly how much cash is safe to spend without risking upcoming obligations.",
      category: "Planning",
      badge: null,
      slug: "safe-spending-calculator"
    },
    {
      icon: BarChart3,
      title: "Mathematical Payout Forecasting",
      description: "DD+7 reserve modeling with per-order net cash calculations. Accounts for fees, returns, chargebacks, and Amazon's settlement mechanics with adjustable safety buffers (−3% to −15%).",
      category: "Analytics",
      badge: "Popular",
      slug: "amazon-payout-forecasting"
    },
    {
      icon: Lock,
      title: "Bank-Level Security",
      description: "All financial data encrypted at rest and in transit. SOC 2 compliant infrastructure.",
      category: "Security",
      badge: null,
      slug: "bank-level-security"
    },
  ];

  const categories = ["All", "Core", "AI", "Analytics", "Planning", "Integrations", "Security"];
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredFeatures = activeCategory === "All" 
    ? features 
    : features.filter(f => f.category === activeCategory);

  return (
    <PublicLayout>
      <Helmet>
        <title>Amazon Cashflow Management Software Features | Auren</title>
        <meta
          name="description"
          content="Discover Auren's marketplace cash flow software — forecast revenue, manage payouts, and optimize your working capital. Complete Amazon cashflow management tools."
        />
        <meta name="keywords" content="amazon cashflow management software, marketplace cash flow software, amazon payout forecasting, cashflow automation, amazon seller tools" />
        <link rel="canonical" href="https://aurenapp.com/features" />
        <meta property="og:title" content="Amazon Cashflow Management Software Features | Auren" />
        <meta property="og:description" content="Discover Auren's marketplace cash flow software — forecast revenue, manage payouts, and optimize your working capital." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aurenapp.com/features" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Amazon Cashflow Management Software Features | Auren" />
        <meta name="twitter:description" content="Discover all the powerful Amazon cashflow management features to forecast payouts and optimize marketplace finances." />
      </Helmet>

        {/* Hero Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge className="mb-4">Full Feature Suite</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Everything You Need to Master Cash Flow
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              From AI-powered insights to Amazon integration, Auren provides the complete toolkit for marketplace sellers to forecast, plan, and optimize their finances.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/signup")}>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/schedule-demo")}>
                Schedule a Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Signature Features */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-gradient-primary">✨ Signature Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for Amazon Sellers
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our most powerful features designed to give you complete control over your cash flow
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto justify-items-center">
              {/* Safe Spending Power */}
              <Card className="bg-gradient-to-br from-green-500/10 via-background to-background border-green-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 w-full max-w-md">
                <CardHeader>
                  <div className="mb-4 p-3 rounded-xl bg-green-500/20 w-fit mx-auto">
                    <Wallet className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-center">💰 Safe Spending Power</CardTitle>
                  <CardDescription className="text-base text-center">
                    Know exactly how much you can spend for the next 180 days. Make confident purchasing decisions without risking cash shortfalls.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* AI PDF Purchase Order Extractor */}
              <Card className="bg-gradient-to-br from-blue-500/10 via-background to-background border-blue-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 w-full max-w-md">
                <CardHeader>
                  <div className="mb-4 p-3 rounded-xl bg-blue-500/20 w-fit mx-auto">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl text-center">📄 AI PDF Purchase Order Extractor</CardTitle>
                  <CardDescription className="text-base text-center">
                    Upload any purchase order document and let AI automatically extract and fill out all the details for you. Save time and reduce manual data entry errors.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Calculated Buying Opportunities */}
              <Card className="bg-gradient-to-br from-purple-500/10 via-background to-background border-purple-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 w-full max-w-md">
                <CardHeader>
                  <div className="mb-4 p-3 rounded-xl bg-purple-500/20 w-fit mx-auto">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-2xl text-center">🎯 Calculated Buying Opportunities</CardTitle>
                  <CardDescription className="text-base text-center">
                    Add projections and search by amount or date to find perfect buying opportunities. Smart purchase planning based on your projected cash flow.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Cash Flow Calendar */}
              <Card className="bg-gradient-to-br from-orange-500/10 via-background to-background border-orange-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 w-full max-w-md">
                <CardHeader>
                  <div className="mb-4 p-3 rounded-xl bg-orange-500/20 w-fit mx-auto">
                    <Calendar className="h-8 w-8 text-orange-600" />
                  </div>
                  <CardTitle className="text-2xl text-center">Cash Flow Calendar</CardTitle>
                  <CardDescription className="text-base text-center">
                    Visualize your entire financial future on an interactive calendar. See exactly when money comes in and goes out, with 365-day forecasting.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Scenario Planning */}
              <Card className="bg-gradient-to-br from-teal-500/10 via-background to-background border-teal-500/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 w-full max-w-md md:col-span-2 md:max-w-md md:mx-auto">
                <CardHeader>
                  <div className="mb-4 p-3 rounded-xl bg-teal-500/20 w-fit mx-auto">
                    <Target className="h-8 w-8 text-teal-600" />
                  </div>
                  <CardTitle className="text-2xl text-center">Scenario Planning</CardTitle>
                  <CardDescription className="text-base text-center">
                    Model what-if scenarios to understand how revenue changes, new expenses, or vendor terms affect your cash position before making decisions.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Mathematical Forecasting Deep Dive */}
        <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-background dark:from-blue-950/20 dark:via-purple-950/20 dark:to-background">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600">🎯 Industry-Leading Accuracy</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Mathematical Amazon Payout Forecasting
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The most accurate Amazon payout forecasting engine on the market. Built on Amazon's actual settlement mechanics, not guesswork.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* How It Works */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    The Formula
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <p className="text-xs font-semibold mb-2">Net Cash per Order:</p>
                    <p className="text-xs font-mono">Net = (Gross − Fees − Shipping − Ads) × (1 − Return%) × (1 − Chargeback%)</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <p className="text-xs font-semibold mb-2">Reserve Policy (DD+7):</p>
                    <p className="text-xs font-mono">Unlock Date = Delivery Date + 7 days</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <p className="text-xs font-semibold mb-2">Settlement Payout:</p>
                    <p className="text-xs font-mono">Payout = [Eligible Cash + Prior Balance + Adjustments] − Reserve</p>
                  </div>
                </CardContent>
              </Card>

              {/* Safety Net Levels */}
              <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Adjustable Safety Buffers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Aggressive (−3%)</p>
                      <p className="text-xs text-muted-foreground">For 1–1.5 day settlement cycles, low returns</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Moderate (−8%)</p>
                      <p className="text-xs text-muted-foreground">For ~2 day cycles, steady payouts (Recommended)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Conservative (−15%)</p>
                      <p className="text-xs text-muted-foreground">For 3+ day cycles, volatile payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* What We Model */}
            <Card>
              <CardHeader>
                <CardTitle>What Auren Models</CardTitle>
                <CardDescription>Unlike basic forecasters, we account for Amazon's actual settlement mechanics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">DD+7 Reserve Policy</p>
                      <p className="text-xs text-muted-foreground">Tracks delivery date + 7 day hold period</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Order-Level Net Cash</p>
                      <p className="text-xs text-muted-foreground">Per-order calculations with all fees included</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Return & Chargeback Rates</p>
                      <p className="text-xs text-muted-foreground">Historical patterns by product category</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Account Reserves</p>
                      <p className="text-xs text-muted-foreground">Recent deliveries within reserve window</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Accuracy Disclaimer:</strong> Forecasts assume DD+7 reserve policy. Accuracy may vary during account reviews or high-risk status.
              </p>
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Forecasting Your Payouts
              </Button>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 px-4 border-b bg-card/30">
          <div className="container mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  onClick={() => setActiveCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group" 
                    onClick={() => navigate(`/features/${feature.slug}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        {feature.badge && (
                          <Badge variant={feature.badge === "AI" ? "default" : "secondary"}>
                            {feature.badge}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                      <div className="mt-4 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Learn more</span>
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-t from-primary/5 to-background">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Take Control of Your Cash Flow?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join hundreds of Amazon sellers who use Auren to forecast payouts, plan expenses, and grow with confidence.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" onClick={() => navigate("/signup")}>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/schedule-demo")}>
                Schedule a Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </div>
        </section>

    </PublicLayout>
  );
};

export default Features;
