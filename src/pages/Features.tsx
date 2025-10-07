import { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
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
} from "lucide-react";

const Features = () => {
  const navigate = useNavigate();

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
      title: "Smart Transaction Matching",
      description: "AI-powered matching between bank transactions and purchase orders. One-click reconciliation.",
      category: "AI",
      badge: "AI",
      slug: "smart-transaction-matching"
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
      icon: TrendingUp,
      title: "Revenue Forecasting",
      description: "Predict future revenue based on historical patterns and Amazon payout schedules.",
      category: "Analytics",
      badge: null,
      slug: "revenue-forecasting"
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
    <>
      <Helmet>
        <title>Amazon Cash Flow Forecasting Features | AI Tools for Sellers | Auren</title>
        <meta
          name="description"
          content="AI-powered forecasting, 365-day projections, scenario planning & automated alerts. Comprehensive cash flow tools for Amazon FBA sellers. View all features."
        />
        <meta name="keywords" content="amazon cashflow forecasting features, payout prediction tools, FBA financial planning, cash flow calendar, scenario planning for sellers, AI forecasting" />
        <link rel="canonical" href="https://aurenapp.com/features" />
        <meta property="og:title" content="Amazon Cash Flow Forecasting Features | Auren" />
        <meta property="og:description" content="AI-powered cash flow forecasting, Amazon integration, scenario planning, and advanced analytics for marketplace sellers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aurenapp.com/features" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Features - Cash Flow Management Tools | Auren" />
        <meta name="twitter:description" content="Discover all the powerful features that help Amazon sellers forecast payouts and manage cash flow." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src={aurenIcon} alt="Auren" className="h-8" />
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Button variant="ghost" onClick={() => navigate("/")}>Home</Button>
              <Button variant="ghost" onClick={() => navigate("/features")}>Features</Button>
              <Button variant="ghost" onClick={() => navigate("/docs")}>Docs</Button>
              <Button variant="ghost" onClick={() => navigate("/blog")}>Blog</Button>
              <Button onClick={() => navigate("/auth")}>Get Started</Button>
            </nav>
          </div>
        </header>

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
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/demo")}>
                View Demo
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
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/schedule-demo")}>
                Schedule a Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-12 px-4">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>© 2025 Auren. All rights reserved.</p>
            <div className="flex gap-4 justify-center mt-4">
              <Button variant="link" onClick={() => navigate("/privacy-policy")}>Privacy</Button>
              <Button variant="link" onClick={() => navigate("/docs")}>Documentation</Button>
              <Button variant="link" onClick={() => navigate("/support")}>Support</Button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Features;
