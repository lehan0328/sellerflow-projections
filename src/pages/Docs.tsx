import { useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  BookOpen, 
  Search, 
  Settings, 
  CreditCard, 
  TrendingUp, 
  Users, 
  BarChart3, 
  HelpCircle,
  DollarSign,
  Link as LinkIcon,
  ShoppingCart,
  FileText
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const Docs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const docSections = [
    {
      title: "Getting Started",
      description: "Learn the basics and set up your account",
      icon: <BookOpen className="h-6 w-6" />,
      path: "/docs/getting-started",
      articles: [
        "Quick Setup Guide (5 minutes)",
        "Account Configuration", 
        "First Time Setup",
        "Understanding Your Dashboard"
      ]
    },
    {
      title: "Amazon Integration",
      description: "Connect and manage your Amazon seller accounts",
      icon: <ShoppingCart className="h-6 w-6" />,
      path: "/docs/amazon-integration",
      articles: [
        "Connecting Amazon Seller Central",
        "Multi-Marketplace Setup",
        "95%+ Accurate Payout Forecasting",
        "Settlement Reports & History"
      ]
    },
    {
      title: "Bank Connections",
      description: "Link your bank accounts for real-time updates",
      icon: <CreditCard className="h-6 w-6" />,
      path: "/docs/bank-connections",
      articles: [
        "Adding Bank Accounts via Plaid",
        "Credit Card Tracking",
        "Transaction Importing",
        "Security & Encryption"
      ]
    },
    {
      title: "AI Transaction Matching",
      description: "Automatically match and reconcile bank transactions",
      icon: <LinkIcon className="h-6 w-6" />,
      path: "/docs/transaction-matching",
      articles: [
        "How AI Matching Works",
        "Reviewing Match Suggestions",
        "Manual Matching",
        "Match Accuracy Tips"
      ]
    },
    {
      title: "AI Features & Insights",
      description: "Leverage AI for smarter cash flow decisions",
      icon: <TrendingUp className="h-6 w-6" />,
      path: "/docs/ai-features",
      articles: [
        "Daily AI Financial Insights",
        "Buying Opportunities Analysis",
        "AI PDF Data Extractor",
        "24/7 AI Support Chat"
      ]
    },
    {
      title: "Cash Flow Management",
      description: "Master your cash flow forecasting and planning",
      icon: <BarChart3 className="h-6 w-6" />,
      path: "/docs/cash-flow",
      articles: [
        "365-Day Cash Flow Forecasting",
        "Seasonal Planning for Q4",
        "Safe Spending Calculator",
        "Credit Optimization"
      ]
    },
    {
      title: "Vendor Management",
      description: "Track unlimited suppliers and purchase orders",
      icon: <Users className="h-6 w-6" />,
      path: "/docs/vendors",
      articles: [
        "Adding Unlimited Vendors",
        "Payment Terms & Due Dates",
        "Purchase Orders & Tracking",
        "Partial Payments"
      ]
    },
    {
      title: "Income & Customers",
      description: "Monitor and forecast your income streams",
      icon: <DollarSign className="h-6 w-6" />,
      path: "/docs/income",
      articles: [
        "Customer Management",
        "Sales Orders",
        "Recurring Income",
        "Payment Collection"
      ]
    },
    {
      title: "Advanced Features",
      description: "Scenario planning, notifications, and analytics",
      icon: <Settings className="h-6 w-6" />,
      path: "/docs/advanced-features",
      articles: [
        "Scenario Planning (Professional)",
        "Automated Notifications (Professional)",
        "Document Storage",
        "Team Management & Permissions"
      ]
    },
    {
      title: "FAQ & Troubleshooting",
      description: "Common questions and solutions",
      icon: <HelpCircle className="h-6 w-6" />,
      path: "/docs/faq",
      articles: [
        "Common Issues",
        "Pricing & Plans",
        "Security Questions",
        "Contact Support"
      ]
    }
  ];

  const filteredSections = docSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.articles.some(article => article.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Documentation - Amazon Cashflow Management | Auren</title>
        <meta name="description" content="Learn how to use Auren's amazon cashflow management software. Complete guides for forecasting, bank integration, and marketplace cash flow management." />
        <meta name="keywords" content="amazon cashflow documentation, marketplace cash flow guides, cashflow management help" />
        <link rel="canonical" href="https://aurenapp.com/docs" />
      </Helmet>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/')}
                className="hover-scale transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center space-x-2">
                    <span>Documentation</span>
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Learn how to use Auren effectively
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button size="sm" className="bg-gradient-primary" onClick={() => navigate('/auth')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Hero Section */}
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-4xl font-bold">
              Auren Documentation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master your Amazon business cash flow with 95%+ accurate forecasting, 
              AI transaction matching, buying opportunities analysis, and unlimited vendor tracking
            </p>
            <Badge variant="secondary" className="text-sm">
              Last Updated: January 2025
            </Badge>
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-3 mb-12">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300 hover-scale">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <BookOpen className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="font-semibold">Quick Start</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Get up and running in 5 minutes
                </p>
                <Link to="/docs/getting-started">
                  <Button size="sm" variant="outline" className="w-full">
                    Start Here
                    <LinkIcon className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-elevated transition-all duration-300 hover-scale">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Amazon Setup</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  95%+ accurate payout forecasting
                </p>
                <Link to="/docs/amazon-integration">
                  <Button size="sm" variant="outline" className="w-full">
                    Learn More
                    <LinkIcon className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-elevated transition-all duration-300 hover-scale">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <HelpCircle className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold">Need Help?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Find answers to common questions
                </p>
                <Link to="/docs/faq">
                  <Button size="sm" variant="outline" className="w-full">
                    View FAQ
                    <LinkIcon className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-8" />

          {/* Documentation Sections */}
          <div className="space-y-8">
            <h3 className="text-2xl font-bold">Browse by Category</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              {filteredSections.map((section, index) => (
                <Card 
                  key={index} 
                  className="shadow-card hover:shadow-elevated transition-all duration-300 hover-scale animate-fade-in" 
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {section.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2">
                      {section.articles.slice(0, 3).map((article, articleIndex) => (
                        <li key={articleIndex}>
                          <Link 
                            to={`${section.path}#${article.toLowerCase().replace(/\s+/g, '-')}`}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors story-link"
                          >
                            {article}
                          </Link>
                        </li>
                      ))}
                      {section.articles.length > 3 && (
                        <li className="text-sm text-muted-foreground">
                          +{section.articles.length - 3} more articles
                        </li>
                      )}
                    </ul>
                    <Link to={section.path}>
                      <Button size="sm" variant="outline" className="w-full mt-4">
                        View All Articles
                        <LinkIcon className="ml-2 h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {searchTerm && filteredSections.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try searching with different keywords or browse our categories above.
              </p>
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            </div>
          )}

          {/* Contact Section */}
          <div className="mt-16 text-center">
            <Card className="bg-muted/30 shadow-card">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">Still need help?</h3>
                <p className="text-muted-foreground mb-6">
                  Our support team is here to help you succeed with Auren.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" onClick={() => navigate('/support')}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Get Support
                  </Button>
                  <Button className="bg-gradient-primary" onClick={() => navigate('/demo')}>
                    Try Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;