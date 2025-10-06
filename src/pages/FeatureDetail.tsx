import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, ArrowRight } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";

// Feature data with full SEO content
const FEATURE_DETAILS: Record<string, {
  title: string;
  description: string;
  benefits: string[];
  useCases: string[];
  howItWorks: string[];
  whoItsFor: string[];
  metaDescription: string;
}> = {
  "cash-flow-calendar": {
    title: "Cash Flow Calendar",
    description: "Visualize your entire financial future with an interactive calendar that shows every dollar coming in and going out. Perfect for Amazon sellers who need to track multiple revenue streams and expenses.",
    metaDescription: "Track Amazon payouts, vendor payments, and expenses with Auren's visual cash flow calendar. See your financial future at a glance for better planning.",
    benefits: [
      "See your entire financial timeline in one view",
      "Track Amazon payout schedules alongside expenses",
      "Identify cash gaps weeks in advance",
      "Plan inventory purchases with confidence",
      "Visual color-coding for quick insights",
      "Daily, weekly, and monthly views available"
    ],
    useCases: [
      "Planning Q4 inventory builds during peak season",
      "Coordinating supplier payments with Amazon payouts",
      "Managing multiple marketplace disbursement schedules",
      "Avoiding overdrafts during slow sales periods",
      "Timing business expenses with cash availability"
    ],
    howItWorks: [
      "Connect your Amazon Seller Central account via secure API",
      "Link bank accounts and credit cards through Plaid",
      "Add vendor payments and recurring expenses",
      "View all transactions on an interactive calendar",
      "Click any day to see detailed inflows and outflows",
      "Adjust future dates by dragging and dropping events"
    ],
    whoItsFor: [
      "Amazon FBA sellers managing inventory payments",
      "Multi-marketplace sellers tracking multiple payouts",
      "Private label brands coordinating supplier orders",
      "Wholesalers juggling vendor terms and cash flow",
      "Growing sellers planning business expansions"
    ]
  },
  "scenario-planning": {
    title: "Scenario Planning",
    description: "Model what-if scenarios to understand how revenue changes, new expenses, or vendor terms affect your cash position. Make data-driven decisions with confidence.",
    metaDescription: "Run financial what-if scenarios for your Amazon business. Model revenue changes, expenses, and vendor terms to make smarter cash flow decisions.",
    benefits: [
      "Test business decisions before committing capital",
      "Understand impact of seasonal revenue changes",
      "Model different vendor payment terms",
      "Plan for best-case and worst-case scenarios",
      "Compare multiple strategies side-by-side",
      "Save scenarios for future reference"
    ],
    useCases: [
      "Planning a major inventory purchase",
      "Evaluating new product line profitability",
      "Testing impact of advertising spend increases",
      "Comparing different financing options",
      "Preparing for seasonal revenue fluctuations"
    ],
    howItWorks: [
      "Start with your current financial data",
      "Adjust revenue projections up or down",
      "Add or modify expense scenarios",
      "Change vendor payment terms",
      "View projected cash position over time",
      "Save and compare multiple scenarios"
    ],
    whoItsFor: [
      "Sellers planning significant inventory investments",
      "Businesses evaluating product line expansions",
      "Entrepreneurs testing business model changes",
      "CFOs managing multiple growth strategies",
      "Sellers preparing for seasonal sales peaks"
    ]
  },
  "advanced-analytics": {
    title: "Advanced Analytics",
    description: "Multi-dashboard analytics covering cashflow, profitability, inventory forecasts, ad performance, and account health. Get deep insights into every aspect of your Amazon business.",
    metaDescription: "Comprehensive analytics for Amazon sellers: cashflow, profitability, inventory, ads, and account health. Make data-driven decisions with advanced insights.",
    benefits: [
      "Track key metrics across multiple dashboards",
      "Identify profitability trends by product",
      "Forecast inventory needs accurately",
      "Analyze advertising ROI and ACoS",
      "Monitor account health indicators",
      "Export data for external reporting"
    ],
    useCases: [
      "Identifying top-performing products by margin",
      "Optimizing ad spend across campaigns",
      "Forecasting inventory reorder points",
      "Tracking monthly profitability trends",
      "Monitoring account health metrics"
    ],
    howItWorks: [
      "Data syncs automatically from Amazon",
      "View pre-built dashboards for key metrics",
      "Customize date ranges and filters",
      "Drill down into specific products or time periods",
      "Set up alerts for important thresholds",
      "Schedule automated reports"
    ],
    whoItsFor: [
      "Data-driven sellers optimizing profitability",
      "Agencies managing multiple client accounts",
      "Growing brands tracking product performance",
      "Finance teams needing detailed reporting",
      "Sellers preparing for investor presentations"
    ]
  },
  "ai-cash-flow-insights": {
    title: "AI Cash Flow Insights",
    description: "Get daily AI-generated insights about your cash position, spending patterns, and optimization opportunities. Let artificial intelligence spot opportunities you might miss.",
    metaDescription: "Daily AI-powered insights for Amazon seller cash flow. Automatic analysis of spending patterns and optimization opportunities.",
    benefits: [
      "Receive personalized daily insights",
      "Spot unusual spending patterns automatically",
      "Get proactive cash shortage warnings",
      "Discover optimization opportunities",
      "Learn from AI-powered recommendations",
      "Improve financial decision-making over time"
    ],
    useCases: [
      "Identifying unusual expense patterns",
      "Getting early warnings about cash shortfalls",
      "Finding cost reduction opportunities",
      "Optimizing payment timing",
      "Understanding seasonal cash flow patterns"
    ],
    howItWorks: [
      "AI analyzes your financial data daily",
      "Machine learning identifies patterns and anomalies",
      "System generates personalized insights",
      "Receive notifications in your dashboard",
      "Act on recommendations with one click",
      "AI learns from your business over time"
    ],
    whoItsFor: [
      "Busy sellers wanting automated analysis",
      "Growing businesses needing proactive alerts",
      "Data-minded entrepreneurs optimizing operations",
      "Multi-tasking founders managing many priorities",
      "Sellers wanting to prevent cash flow issues"
    ]
  },
  "ai-pdf-extractor": {
    title: "AI PDF Extractor",
    description: "Upload purchase orders and invoices - our AI automatically extracts vendor details, amounts, and payment terms. Save hours of manual data entry.",
    metaDescription: "Automatically extract data from purchase orders and invoices with AI. Save time on manual entry for Amazon seller cash flow management.",
    benefits: [
      "Eliminate manual data entry",
      "Extract data in seconds, not minutes",
      "Automatic vendor detail recognition",
      "Smart payment term detection",
      "99% accuracy on standard formats",
      "Support for multiple document types"
    ],
    useCases: [
      "Processing supplier invoices quickly",
      "Recording purchase orders at scale",
      "Managing international supplier documents",
      "Handling high-volume invoice processing",
      "Maintaining accurate vendor records"
    ],
    howItWorks: [
      "Upload PDF invoice or purchase order",
      "AI scans and identifies key information",
      "System extracts vendor, amounts, and terms",
      "Review and confirm extracted data",
      "Transaction automatically added to cash flow",
      "Vendor information saved for future use"
    ],
    whoItsFor: [
      "High-volume sellers with many suppliers",
      "Businesses processing dozens of invoices weekly",
      "Sellers wanting to reduce administrative time",
      "Growing brands scaling operations",
      "Teams needing faster invoice processing"
    ]
  },
  "ai-financial-assistant": {
    title: "AI Financial Assistant",
    description: "Chat with AI about your finances. Ask questions, get advice, and understand your cash flow in plain English. Your personal CFO available 24/7.",
    metaDescription: "Chat with an AI financial assistant about your Amazon business cash flow. Get instant answers and advice in plain English, 24/7.",
    benefits: [
      "Get instant answers to financial questions",
      "Understand complex data in plain language",
      "Receive personalized financial advice",
      "Available 24/7 for immediate help",
      "No need to dig through reports manually",
      "Context-aware responses based on your data"
    ],
    useCases: [
      "Asking 'Can I afford this inventory purchase?'",
      "Understanding why cash is low this month",
      "Getting payment timing recommendations",
      "Exploring financing options",
      "Learning cash flow best practices"
    ],
    howItWorks: [
      "Open the chat interface in your dashboard",
      "Type your financial question naturally",
      "AI analyzes your real business data",
      "Receive personalized answer with context",
      "Ask follow-up questions for clarity",
      "Get actionable recommendations"
    ],
    whoItsFor: [
      "Sellers without dedicated financial staff",
      "Entrepreneurs learning cash flow management",
      "Busy founders needing quick answers",
      "Growing businesses making complex decisions",
      "Anyone wanting financial guidance on-demand"
    ]
  },
  "amazon-integration": {
    title: "Amazon Integration",
    description: "Automatically sync Amazon payouts, orders, fees, and refunds. Support for multiple marketplaces including US, UK, EU, and more.",
    metaDescription: "Automatic Amazon integration for seller cash flow. Sync payouts, orders, fees, and refunds from all marketplaces - US, UK, EU and more.",
    benefits: [
      "Automatic payout forecasting with 95% accuracy",
      "Real-time order and fee tracking",
      "Multi-marketplace support (US, UK, EU, etc.)",
      "Detailed transaction breakdown",
      "Historical data import",
      "Secure read-only API connection"
    ],
    useCases: [
      "Tracking payouts across multiple marketplaces",
      "Forecasting bi-weekly Amazon disbursements",
      "Understanding fee structures",
      "Reconciling Amazon payments",
      "Planning around reserve releases"
    ],
    howItWorks: [
      "Connect via Amazon SP-API (no password needed)",
      "Grant read-only permissions",
      "System imports historical data",
      "Automatic sync every 24 hours",
      "Payout forecasting algorithms activate",
      "View all Amazon data in unified dashboard"
    ],
    whoItsFor: [
      "FBA sellers managing multiple marketplaces",
      "Private label brands tracking product performance",
      "Wholesalers with high transaction volumes",
      "Agencies managing client Amazon accounts",
      "Anyone selling on Amazon needing cash visibility"
    ]
  },
  "bank-account-sync": {
    title: "Bank Account Sync",
    description: "Connect unlimited bank accounts via Plaid. Real-time balance updates and automatic transaction syncing keep your cash flow accurate.",
    metaDescription: "Connect unlimited business bank accounts with Plaid integration. Real-time balance updates and automatic transaction sync for accurate cash flow.",
    benefits: [
      "Connect unlimited bank accounts",
      "Real-time balance updates",
      "Automatic transaction categorization",
      "Bank-grade security via Plaid",
      "Support for 10,000+ financial institutions",
      "Historical transaction import"
    ],
    useCases: [
      "Tracking cash across multiple business accounts",
      "Reconciling bank transactions with forecasts",
      "Monitoring real-time account balances",
      "Categorizing business expenses automatically",
      "Managing checking and savings accounts together"
    ],
    howItWorks: [
      "Click to add bank account",
      "Search and select your institution",
      "Enter credentials in secure Plaid interface",
      "Grant read-only permissions",
      "Historical transactions import automatically",
      "Daily syncing keeps data current"
    ],
    whoItsFor: [
      "Sellers with multiple business bank accounts",
      "Businesses wanting real-time cash visibility",
      "Entrepreneurs tired of manual bank reconciliation",
      "Growing brands needing automated tracking",
      "Anyone wanting accurate cash flow data"
    ]
  },
  "credit-card-management": {
    title: "Credit Card Management",
    description: "Track credit utilization, payment due dates, and available credit across all your business cards. Optimize credit for better cash flow.",
    metaDescription: "Manage business credit cards for better cash flow. Track utilization, due dates, and available credit across all cards in one dashboard.",
    benefits: [
      "Track multiple credit cards in one place",
      "Monitor credit utilization ratios",
      "Never miss a payment due date",
      "Optimize credit usage for rewards",
      "See available credit at a glance",
      "Plan payments around cash availability"
    ],
    useCases: [
      "Maximizing credit card rewards strategically",
      "Avoiding late payment fees",
      "Managing credit utilization below 30%",
      "Timing large purchases with available credit",
      "Coordinating payments with Amazon payouts"
    ],
    howItWorks: [
      "Connect credit cards via Plaid",
      "System tracks balances and limits daily",
      "Payment due dates added to calendar",
      "Utilization percentages calculated automatically",
      "Receive alerts before due dates",
      "View all cards in unified dashboard"
    ],
    whoItsFor: [
      "Sellers leveraging credit for inventory purchases",
      "Businesses optimizing credit card rewards",
      "Entrepreneurs managing cash flow with credit",
      "Growing brands using multiple business cards",
      "Anyone wanting to avoid late fees and penalties"
    ]
  },
  "vendor-management": {
    title: "Vendor Management",
    description: "Manage all vendor relationships, payment schedules, and purchase orders in one place. Never miss a payment or lose a supplier discount.",
    metaDescription: "Manage supplier relationships and payment schedules for Amazon sellers. Track purchase orders, payment terms, and vendor discounts.",
    benefits: [
      "Centralized vendor database",
      "Automated payment scheduling",
      "Track payment terms and discounts",
      "Purchase order management",
      "Payment history tracking",
      "Vendor performance insights"
    ],
    useCases: [
      "Managing relationships with multiple suppliers",
      "Tracking net payment terms (Net 30, 60, etc.)",
      "Ensuring early payment discounts",
      "Coordinating inventory orders",
      "Planning payments around cash availability"
    ],
    howItWorks: [
      "Add vendors with contact and payment information",
      "Create purchase orders with payment terms",
      "System schedules payments automatically",
      "Receive reminders before due dates",
      "Track payment history by vendor",
      "Analyze vendor spending patterns"
    ],
    whoItsFor: [
      "Sellers working with multiple suppliers",
      "Private label brands managing manufacturers",
      "Wholesalers coordinating large orders",
      "Growing businesses scaling supplier relationships",
      "Anyone wanting organized vendor management"
    ]
  },
  "income-tracking": {
    title: "Income Tracking",
    description: "Log one-time and recurring income. Track customer payments and manage receivables to keep cash flow positive.",
    metaDescription: "Track business income and customer payments for Amazon sellers. Manage receivables and recurring revenue streams in one dashboard.",
    benefits: [
      "Track all income streams in one place",
      "Manage recurring revenue subscriptions",
      "Monitor customer payment status",
      "Forecast future income accurately",
      "Categorize income by source",
      "Export income reports for tax prep"
    ],
    useCases: [
      "Tracking income from multiple sales channels",
      "Managing wholesale customer payments",
      "Forecasting subscription revenue",
      "Monitoring consulting or service income",
      "Coordinating income with expenses"
    ],
    howItWorks: [
      "Add income items manually or via integrations",
      "Set up recurring income schedules",
      "Mark payments as received",
      "Track overdue receivables",
      "View income on cash flow calendar",
      "Generate income reports by category"
    ],
    whoItsFor: [
      "Multi-channel sellers beyond just Amazon",
      "B2B wholesalers managing customer payments",
      "Sellers with recurring revenue streams",
      "Businesses offering services alongside products",
      "Anyone needing complete income visibility"
    ]
  },
  "recurring-expenses": {
    title: "Recurring Expenses",
    description: "Set up subscriptions and recurring costs. Automatically project future expenses on your calendar for better planning.",
    metaDescription: "Manage recurring business expenses and subscriptions. Automatic expense forecasting for software, services, and operational costs.",
    benefits: [
      "Never forget a subscription payment",
      "Automatic expense forecasting",
      "Track all recurring business costs",
      "Identify subscription waste",
      "Budget for monthly operational expenses",
      "Annual expense summaries"
    ],
    useCases: [
      "Managing software subscription renewals",
      "Tracking monthly service expenses",
      "Budgeting for annual insurance payments",
      "Monitoring warehouse and storage fees",
      "Planning for seasonal cost increases"
    ],
    howItWorks: [
      "Add recurring expense with frequency",
      "Set start date and optional end date",
      "System projects future occurrences",
      "Expenses appear on cash flow calendar",
      "Receive reminders before payments",
      "Mark payments as completed manually"
    ],
    whoItsFor: [
      "Sellers with multiple software subscriptions",
      "Businesses tracking operational expenses",
      "Entrepreneurs budgeting monthly costs",
      "Growing brands managing increasing expenses",
      "Anyone wanting expense forecasting"
    ]
  },
  "smart-transaction-matching": {
    title: "Smart Transaction Matching",
    description: "AI-powered matching between bank transactions and purchase orders. One-click reconciliation saves hours each month.",
    metaDescription: "AI-powered transaction matching for Amazon sellers. Automatic reconciliation of bank transactions with purchase orders and invoices.",
    benefits: [
      "Automatic transaction-to-purchase-order matching",
      "Save hours on manual reconciliation",
      "99% accuracy on standard transactions",
      "Identify discrepancies instantly",
      "One-click confirmation",
      "Audit trail for all matches"
    ],
    useCases: [
      "Reconciling supplier payments with invoices",
      "Matching bank charges to purchases",
      "Identifying duplicate or incorrect payments",
      "Maintaining accurate accounting records",
      "Preparing for tax season efficiently"
    ],
    howItWorks: [
      "Bank transactions sync automatically",
      "AI compares with purchase orders and invoices",
      "System suggests matches with confidence scores",
      "Review and confirm with one click",
      "Unmatched transactions highlighted for review",
      "Export matched records for accounting"
    ],
    whoItsFor: [
      "High-volume sellers with many transactions",
      "Businesses wanting automated reconciliation",
      "Sellers preparing for audits or taxes",
      "Growing brands needing accurate records",
      "Anyone tired of manual transaction matching"
    ]
  },
  "safe-spending-calculator": {
    title: "Safe Spending Calculator",
    description: "Know exactly how much cash is safe to spend without risking upcoming obligations. Make confident purchasing decisions.",
    metaDescription: "Calculate safe spending limits for your Amazon business. Know exactly how much you can spend without risking cash flow.",
    benefits: [
      "Know your safe spending limit instantly",
      "Avoid cash shortfalls from overspending",
      "Account for upcoming obligations automatically",
      "Make confident inventory purchase decisions",
      "Adjust for different time horizons",
      "Include or exclude credit limits"
    ],
    useCases: [
      "Determining safe inventory purchase amounts",
      "Planning discretionary business spending",
      "Evaluating advertising budget increases",
      "Assessing equipment purchase feasibility",
      "Making confident expansion decisions"
    ],
    howItWorks: [
      "System analyzes your cash position",
      "Calculates upcoming obligations",
      "Factors in forecasted income",
      "Applies your safety buffer preference",
      "Displays safe spending amount",
      "Updates daily as data changes"
    ],
    whoItsFor: [
      "Sellers making large inventory investments",
      "Conservative businesses prioritizing safety",
      "Growing brands balancing risk and growth",
      "Entrepreneurs avoiding cash crunches",
      "Anyone wanting spending confidence"
    ]
  },
  "revenue-forecasting": {
    title: "Revenue Forecasting",
    description: "Predict future revenue based on historical patterns and Amazon payout schedules. Plan growth with data-driven confidence.",
    metaDescription: "Forecast future revenue for Amazon sellers based on historical data and payout schedules. Data-driven revenue predictions.",
    benefits: [
      "Predict revenue with 90%+ accuracy",
      "Identify growth trends and patterns",
      "Plan for seasonal fluctuations",
      "Adjust forecasts with real-time data",
      "Multiple forecast scenarios",
      "Export predictions for planning"
    ],
    useCases: [
      "Planning Q4 inventory investments",
      "Setting realistic sales targets",
      "Evaluating marketing campaign ROI",
      "Preparing revenue projections for investors",
      "Budgeting for business expansion"
    ],
    howItWorks: [
      "System analyzes historical sales data",
      "Identifies patterns and seasonality",
      "Factors in Amazon payout cycles",
      "Applies statistical forecasting models",
      "Generates revenue predictions",
      "Updates daily with new data"
    ],
    whoItsFor: [
      "Data-driven sellers planning growth",
      "Businesses seeking investor funding",
      "Entrepreneurs setting sales targets",
      "Growing brands budgeting expansions",
      "Anyone wanting revenue visibility"
    ]
  },
  "bank-level-security": {
    title: "Bank-Level Security",
    description: "All financial data encrypted at rest and in transit. SOC 2 compliant infrastructure ensures your data stays safe and private.",
    metaDescription: "Bank-level security for Amazon seller financial data. SOC 2 compliant, encrypted at rest and in transit, read-only access.",
    benefits: [
      "256-bit AES encryption",
      "SOC 2 Type II compliant",
      "Read-only API connections",
      "Never store bank credentials",
      "Regular security audits",
      "GDPR and CCPA compliant"
    ],
    useCases: [
      "Protecting sensitive financial information",
      "Meeting compliance requirements",
      "Securing multi-user account access",
      "Maintaining data privacy",
      "Ensuring audit trail integrity"
    ],
    howItWorks: [
      "Data encrypted in transit via TLS 1.3",
      "At-rest encryption with AES-256",
      "Plaid handles bank authentication",
      "Amazon SP-API uses OAuth tokens",
      "No password storage anywhere",
      "Regular third-party security audits"
    ],
    whoItsFor: [
      "Privacy-conscious business owners",
      "Regulated businesses needing compliance",
      "Growing brands with security requirements",
      "Sellers working with sensitive data",
      "Anyone prioritizing data protection"
    ]
  }
};

const FeatureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const feature = slug ? FEATURE_DETAILS[slug] : null;

  if (!feature) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Feature Not Found</h1>
          <Button onClick={() => navigate("/features")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Features
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{feature.title} - Cash Flow Management for Amazon Sellers | Auren</title>
        <meta name="description" content={feature.metaDescription} />
        <link rel="canonical" href={`https://aurenapp.com/features/${slug}`} />
        <meta property="og:title" content={`${feature.title} | Auren`} />
        <meta property="og:description" content={feature.metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://aurenapp.com/features/${slug}`} />
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
              <Button variant="ghost" onClick={() => navigate("/features")}>All Features</Button>
              <Button onClick={() => navigate("/auth")}>Get Started</Button>
            </nav>
          </div>
        </header>

        {/* Back Button */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate("/features")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to All Features
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{feature.title}</h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {feature.description}
            </p>
            <div className="flex gap-4">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/demo")}>
                See Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8">Key Benefits</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {feature.benefits.map((benefit, index) => (
                <Card key={index}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8">Common Use Cases</h2>
            <div className="space-y-4">
              {feature.useCases.map((useCase, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">{index + 1}</span>
                      </div>
                      <p className="text-lg">{useCase}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8">How It Works</h2>
            <div className="space-y-6">
              {feature.howItWorks.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg pt-1">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8">Perfect For</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {feature.whoItsFor.map((persona, index) => (
                <Card key={index}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{persona}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-primary text-primary-foreground">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Join hundreds of Amazon sellers using Auren to master their cash flow.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10" onClick={() => navigate("/features")}>
                View All Features
              </Button>
            </div>
            <p className="text-sm opacity-75 mt-4">
              7-day free trial • No credit card required • Cancel anytime
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

export default FeatureDetail;
