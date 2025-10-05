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
          question: "How long does it take to set up Auren?",
          answer: "Most users complete the full setup in under 10 minutes. This includes creating your account, connecting Amazon, and linking your bank accounts. The system starts generating forecasts immediately after your first data sync."
        },
        {
          question: "What do I need to get started?",
          answer: "You'll need: (1) An active Amazon Seller Central account, (2) Access to your business bank accounts, (3) Your Amazon app credentials from Developer Central, and (4) About 10 minutes to complete the setup process."
        },
        {
          question: "Do you offer a free trial or demo?",
          answer: "Yes! You can try our interactive demo without creating an account to see how the platform works. When you're ready to use your real data, sign up for a paid plan. All plans come with a 30-day money-back guarantee."
        },
        {
          question: "Can I use Auren for multiple Amazon accounts?",
          answer: "Yes! All plans include 1 Amazon account connection. You can add more Amazon accounts for $50/mo per additional account. This allows you to manage multiple seller accounts or marketplaces in one dashboard."
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
          question: "What are the pricing plans?",
          answer: "We have three plans: Starter ($29/mo or $290/year) for under $20k monthly Amazon payout, Growing ($59/mo or $590/year) for under $50k, and Professional ($89/mo or $890/year) for under $200k. All plans include unlimited vendors and unlimited transactions. Yearly plans save you ~17%."
        },
        {
          question: "Do you limit the number of vendors or transactions?",
          answer: "No! All plans include unlimited vendors and unlimited transactions. There are no limits on how many purchase orders, invoices, or transactions you can track. The main differences between plans are bank connections, Amazon payout limits, AI features, and number of users."
        },
        {
          question: "Can I add more bank accounts or Amazon accounts?",
          answer: "Yes! Each plan includes a certain number of bank/credit card connections and Amazon accounts. You can purchase add-ons: Additional Bank Account ($7/mo), Additional Amazon Account ($50/mo), or Additional User ($5/mo)."
        },
        {
          question: "Can I change plans anytime?",
          answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades (prorated billing) or at the next billing cycle for downgrades. No long-term contracts required."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards (Visa, MasterCard, American Express) processed securely through Stripe. All payments are encrypted and we don't store payment information on our servers."
        }
      ]
    },
    {
      category: "Features & Usage",
      icon: <Settings className="h-4 w-4" />,
      questions: [
        {
          question: "What is the AI Support Chat?",
          answer: "All users have access to our AI Support Chat assistant that can answer questions about the platform 24/7. It's trained on our complete documentation and can help with setup, features, troubleshooting, and best practices. For complex issues, you can submit a support ticket for human assistance."
        },
        {
          question: "How do I get help if I have an issue?",
          answer: "Start by using the AI Support Chat in the Support page - it can answer most questions instantly. If you need more help, you can submit a support ticket with priority, category, and detailed description. Our support team responds to tickets within 24 hours (4 hours for priority support on Growing/Professional plans)."
        },
        {
          question: "How far ahead can I forecast cash flow?",
          answer: "All plans include 365-day (12-month) cash flow projection. Accuracy is highest for the next 30 days (95%+), good for 1-3 months (85%+), and directional for 3-12 months. Forecasts update automatically as new data syncs from your connected accounts."
        },
        {
          question: "Can I export my data?",
          answer: "Yes, you can export all your data including transactions, forecasts, and reports in CSV, Excel, or PDF formats. Go to Settings > Data Export for all available options. No vendor lock-in - your data is always accessible."
        },
        {
          question: "Do you have AI features?",
          answer: "Yes! Growing and Professional plans include AI insights for personalized financial advice and AI PDF extractor to automatically extract data from purchase orders and invoices. The AI support assistant is available to all users to help answer questions about the platform."
        },
        {
          question: "Can team members access my account?",
          answer: "Yes! The Starter plan is for single users. Growing plan includes 2 additional users, and Professional includes 5 additional users. You can add more users for $5/mo each. Each user can have different permission levels to control access."
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
              Find quick answers to the most common questions about Auren
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
                    Our support team is here to help you succeed with Auren
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Contact Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>AI Support Chat (24/7)</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>Support tickets</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Response Times</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>AI Chat</span>
                        <Badge variant="outline">Instant</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Support Tickets</span>
                        <Badge variant="outline">&lt; 24 hours</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Priority Support</span>
                        <Badge variant="outline">&lt; 4 hours</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button className="bg-gradient-primary" onClick={() => navigate('/support')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Get Support
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/demo')}>
                    Try Demo
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
                    <div className="text-sm text-muted-foreground">See Auren in action</div>
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