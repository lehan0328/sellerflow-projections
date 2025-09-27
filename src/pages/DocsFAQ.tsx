import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Search, 
  HelpCircle, 
  MessageSquare,
  FileText,
  Clock,
  Shield,
  CreditCard,
  ShoppingCart,
  Settings,
  Mail,
  Phone,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const DocsFAQ = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const faqCategories = [
    {
      category: "Getting Started",
      icon: <FileText className="h-4 w-4" />,
      questions: [
        {
          question: "How long does it take to set up CashFlow Pro?",
          answer: "Most users complete the full setup in under 10 minutes. This includes creating your account, connecting Amazon, and linking your bank accounts. The system starts generating forecasts immediately after your first data sync."
        },
        {
          question: "What do I need to get started?",
          answer: "You'll need: (1) An active Amazon Seller Central account, (2) Access to your business bank accounts, (3) Your Amazon app credentials from Developer Central, and (4) About 10 minutes to complete the setup process."
        },
        {
          question: "Is there a free trial?",
          answer: "Yes! We offer a 7-day free trial with full access to all features. No credit card required. You can explore all functionality including Amazon integration, cash flow forecasting, and reporting during your trial."
        },
        {
          question: "Can I use CashFlow Pro for multiple Amazon accounts?",
          answer: "Absolutely. You can connect multiple Amazon seller accounts across different marketplaces. Each additional account may incur extra charges depending on your plan. Check our pricing page for details."
        }
      ]
    },
    {
      category: "Amazon Integration", 
      icon: <ShoppingCart className="h-4 w-4" />,
      questions: [
        {
          question: "Is it safe to connect my Amazon account?",
          answer: "Yes, completely safe. We use Amazon's official SP-API with read-only access. We never store your Amazon credentials and cannot make any changes to your seller account. All data is encrypted in transit and at rest."
        },
        {
          question: "Which Amazon marketplaces are supported?",
          answer: "We support all major Amazon marketplaces including US, UK, Germany, France, Italy, Spain, Canada, Australia, Japan, and Mexico. You can connect multiple marketplaces to get a complete view of your global business."
        },
        {
          question: "How accurate are the payout forecasts?",
          answer: "Our payout forecasting is 95%+ accurate. We analyze your sales patterns, Amazon's payout schedule, and historical data to predict future payouts down to the day. Accuracy improves over time as we learn your business patterns."
        },
        {
          question: "What if my Amazon data isn't syncing?",
          answer: "First, check your connection status in Settings > Amazon Management. Ensure your app credentials are correct and your Amazon app has SP-API access. Data typically syncs within an hour. Contact support if issues persist beyond 24 hours."
        }
      ]
    },
    {
      category: "Banking & Security",
      icon: <Shield className="h-4 w-4" />,
      questions: [
        {
          question: "How do you keep my banking data secure?",
          answer: "We use bank-level security with 256-bit encryption. Banking connections use Plaid (trusted by major banks) with read-only access. We're SOC 2 compliant and never store your banking credentials. All data is encrypted at rest and in transit."
        },
        {
          question: "Which banks are supported?",
          answer: "We support over 12,000 financial institutions through Plaid, including all major US and Canadian banks. This covers business checking, savings, credit cards, and lines of credit. Check Plaid's institution list for specific bank support."
        },
        {
          question: "Can you see my bank account passwords?",
          answer: "No, absolutely not. We use Plaid for bank connections, which means your credentials are never shared with us. Plaid encrypts and securely stores your login information. We only receive read-only access to transaction and balance data."
        },
        {
          question: "What if I want to disconnect my bank?",
          answer: "You can disconnect any bank account instantly from Settings > Bank Management. This immediately revokes access and stops all data syncing. You can reconnect at any time. Disconnecting doesn't delete historical data already imported."
        }
      ]
    },
    {
      category: "Billing & Plans",
      icon: <CreditCard className="h-4 w-4" />,
      questions: [
        {
          question: "What happens after my free trial?",
          answer: "After your 7-day trial, you'll need to choose a paid plan to continue using CashFlow Pro. Your data remains secure and accessible. You can upgrade anytime during or after your trial period."
        },
        {
          question: "Can I change plans anytime?",
          answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades (prorated billing) or at the next billing cycle for downgrades. No long-term contracts required."
        },
        {
          question: "Do you offer refunds?",
          answer: "We offer a 30-day money-back guarantee on all plans. If you're not satisfied within the first 30 days, contact support for a full refund. No questions asked."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards (Visa, MasterCard, American Express) and ACH transfers for annual plans. All payments are processed securely through Stripe. We don't store payment information on our servers."
        }
      ]
    },
    {
      category: "Features & Usage",
      icon: <Settings className="h-4 w-4" />,
      questions: [
        {
          question: "How far ahead can I forecast cash flow?",
          answer: "You can forecast up to 12 months ahead. Accuracy is highest for the next 3 months (95%+), good for 3-6 months (85%+), and directional for 6-12 months (75%+). Forecasts update automatically as new data comes in."
        },
        {
          question: "Can I export my data?",
          answer: "Yes, you can export all your data including transactions, forecasts, and reports in CSV, Excel, or PDF formats. Go to Settings > Data Export for all available options. No vendor lock-in - your data is always accessible."
        },
        {
          question: "Do you integrate with QuickBooks or other accounting software?",
          answer: "Currently, we don't have direct integrations with accounting software, but it's on our roadmap. You can export transaction data to import into your accounting system. Contact support if you have specific integration needs."
        },
        {
          question: "Can team members access my account?",
          answer: "Yes, most plans support multiple team members with different permission levels. You can invite team members and control what they can see and edit. Check your plan details for user limits and collaboration features."
        }
      ]
    },
    {
      category: "Troubleshooting",
      icon: <HelpCircle className="h-4 w-4" />,
      questions: [
        {
          question: "Why are my forecasts different from actual payouts?",
          answer: "Small variations are normal, especially in the first few weeks as the system learns your patterns. Large discrepancies usually indicate: missing marketplace connections, recent business changes, or unusual Amazon activity. Contact support for forecast calibration help."
        },
        {
          question: "My dashboard is loading slowly. What should I do?",
          answer: "Try refreshing your browser or clearing cache. Large amounts of historical data can slow loading. If problems persist, try a different browser or device. Contact support if issues continue - we can optimize your account performance."
        },
        {
          question: "I'm getting error messages. How do I fix them?",
          answer: "Most errors are temporary connection issues that resolve automatically. For persistent errors: (1) Check your internet connection, (2) Verify account credentials in Settings, (3) Try disconnecting and reconnecting integrations. Contact support with specific error messages for help."
        },
        {
          question: "Can I recover deleted data?",
          answer: "We maintain backups of your data for 90 days. Accidentally deleted transactions, vendors, or other data can usually be recovered within this period. Contact support immediately if you've deleted important data by mistake."
        }
      ]
    }
  ];

  // Filter questions based on search term
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/docs')}
                className="hover-scale transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Docs
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">FAQ & Troubleshooting</h1>
                  <p className="text-muted-foreground text-sm">Find answers to common questions</p>
                </div>
              </div>
            </div>
            <Button size="sm" className="bg-gradient-primary" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">
              Find quick answers to the most common questions about CashFlow Pro
            </p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3 text-center">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-primary mb-2">95%+</div>
                <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-success mb-2">&lt; 10min</div>
                <div className="text-sm text-muted-foreground">Setup Time</div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-accent mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Support Available</div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-6">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category, categoryIndex) => (
                <Card key={categoryIndex} className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {category.icon}
                      <span>{category.category}</span>
                      <Badge variant="outline">{category.questions.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.questions.map((faq, faqIndex) => (
                        <AccordionItem key={faqIndex} value={`item-${categoryIndex}-${faqIndex}`}>
                          <AccordionTrigger className="text-left">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Try searching with different keywords or contact our support team.
                </p>
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              </div>
            )}
          </div>

          {/* Contact Support */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 shadow-card">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
                  <p className="text-muted-foreground">
                    Our support team is here to help you succeed with CashFlow Pro
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Contact Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>support@cashflowpro.com</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>Live chat (24/7)</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>+1 (555) 123-4567</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Response Times</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Live Chat</span>
                        <Badge variant="outline">Instant</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Email Support</span>
                        <Badge variant="outline">&lt; 4 hours</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Phone Support</span>
                        <Badge variant="outline">Business hours</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button className="bg-gradient-primary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Live Chat
                  </Button>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => navigate('/docs/getting-started')}>
                  <div className="text-left">
                    <div className="font-medium">Getting Started Guide</div>
                    <div className="text-sm text-muted-foreground">Complete setup walkthrough</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => navigate('/docs/amazon-integration')}>
                  <div className="text-left">
                    <div className="font-medium">Amazon Integration</div>
                    <div className="text-sm text-muted-foreground">Connect your seller account</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => navigate('/demo')}>
                  <div className="text-left">
                    <div className="font-medium">Live Demo</div>
                    <div className="text-sm text-muted-foreground">See CashFlow Pro in action</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Video Tutorials</div>
                    <div className="text-sm text-muted-foreground">Step-by-step video guides</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocsFAQ;