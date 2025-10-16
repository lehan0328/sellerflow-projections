import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Users, 
  Settings, 
  Play,
  FileText,
  AlertCircle,
  Zap,
  Shield,
  DollarSign,
  CreditCard,
  ShoppingCart
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const DocsGettingStarted = () => {
  const navigate = useNavigate();

  const setupSteps = [
    {
      title: "Create Your Account",
      description: "Sign up for Auren and verify your email address",
      time: "2 minutes",
      icon: <Users className="h-5 w-5" />,
      completed: true
    },
    {
      title: "Connect Amazon Account", 
      description: "Link your Amazon Seller Central account for payout data",
      time: "3 minutes",
      icon: <ShoppingCart className="h-5 w-5" />,
      completed: false
    },
    {
      title: "Add Bank Accounts",
      description: "Connect your business bank accounts for real-time balances",
      time: "2 minutes", 
      icon: <CreditCard className="h-5 w-5" />,
      completed: false
    },
    {
      title: "Configure Settings",
      description: "Set up your preferences and business information",
      time: "3 minutes",
      icon: <Settings className="h-5 w-5" />,
      completed: false
    }
  ];

  const keyFeatures = [
    {
      title: "✨ AI Transaction Matching",
      description: "Automatically match bank transactions to vendors and purchase orders. Review and approve matches with one click, saving hours of manual work.",
      icon: <Zap className="h-6 w-6 text-primary" />
    },
    {
      title: "Amazon Payout Forecasting",
      description: "See exactly when your next Amazon payments will arrive with 95%+ accuracy. Plan inventory purchases with confidence.",
      icon: <DollarSign className="h-6 w-6 text-success" />
    },
    {
      title: "✨ Buying Opportunities",
      description: "AI analyzes your cash flow and tells you the optimal time for major purchases when you have available funds (Growing+ plans).",
      icon: <Shield className="h-6 w-6 text-accent" />
    },
    {
      title: "Unlimited Vendors & Transactions",
      description: "Track unlimited suppliers and purchase orders on all plans. No per-transaction fees or vendor limits.",
      icon: <Users className="h-6 w-6 text-muted-foreground" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Getting Started - Amazon Cashflow Software Setup | Auren</title>
        <meta name="description" content="Quick setup guide for Auren's amazon cashflow management software. Connect your accounts and start forecasting marketplace cash flow in minutes." />
        <meta name="keywords" content="amazon cashflow setup, marketplace cash flow onboarding, cashflow software tutorial" />
        <link rel="canonical" href="https://aurenapp.com/docs/getting-started" />
      </Helmet>
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
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Getting Started</h1>
                  <p className="text-muted-foreground text-sm">Setup your Auren account</p>
                </div>
              </div>
            </div>
            <Button size="sm" className="bg-gradient-primary" onClick={() => navigate('/auth')}>
              Get Started Now
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <div className="space-y-4">
            <Badge variant="secondary" className="mb-4">
              <Clock className="h-3 w-3 mr-1" />
              5 minutes setup
            </Badge>
            <h2 className="text-3xl font-bold">Welcome to Auren</h2>
            <p className="text-xl text-muted-foreground">
              Get your Amazon business cash flow under control in just 5 minutes. 
              Connect your accounts and start getting 95%+ accurate forecasts, automatic transaction matching, 
              and AI-powered buying opportunity recommendations immediately.
            </p>
          </div>

          {/* Key Benefits Alert */}
          <Alert className="border-success/20 bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              <strong>Why Auren?</strong> Starting at only $24/mo with unlimited vendors and transactions on all plans. 
              Get 95%+ accurate Amazon payout forecasting, AI transaction matching, buying opportunities analysis, 
              and complete cash flow visibility. Setup takes just 5 minutes.
            </AlertDescription>
          </Alert>

          {/* Quick Setup Checklist */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5 text-primary" />
                <span>Quick Setup Checklist</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {setupSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 rounded-lg border">
                  <div className={`p-2 rounded-full ${step.completed ? 'bg-success text-success-foreground' : 'bg-muted'}`}>
                    {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{step.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Step-by-Step Guide */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Step-by-Step Setup Guide</h3>
            
            {/* Step 1 */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge variant="outline">1</Badge>
                  <span>Create Your Account</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Start by creating your Auren account. You'll need a valid email address and 
                  some basic information about your Amazon business.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">What you'll need:</h5>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Business email address</li>
                    <li>• Company name (or your name for sole proprietors)</li>
                    <li>• Estimated monthly Amazon revenue</li>
                  </ul>
                </div>
                <Button className="bg-gradient-primary" onClick={() => navigate('/auth')}>
                  Create Account Now
                </Button>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge variant="outline">2</Badge>
                  <span>Connect Amazon Seller Central</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Link your Amazon Seller Central account to automatically import payout data 
                  and settlement reports. This is the core of your cash flow forecasting.
                </p>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Note:</strong> We use Amazon's official SP-API with read-only access. 
                    We never store your Amazon credentials and cannot make changes to your seller account.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Supported Marketplaces:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>• Amazon US</div>
                    <div>• Amazon UK</div>
                    <div>• Amazon Germany</div>
                    <div>• Amazon France</div>
                    <div>• Amazon Italy</div>
                    <div>• Amazon Spain</div>
                    <div>• Amazon Canada</div>
                    <div>• Amazon Australia</div>
                  </div>
                </div>

                <Link to="/docs/amazon-integration">
                  <Button variant="outline">
                    View Detailed Amazon Setup Guide
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge variant="outline">3</Badge>
                  <span>Add Your Bank Accounts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Connect your business bank accounts to get real-time balance updates and 
                  complete cash flow visibility. We use Plaid for secure, read-only access.
                </p>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Supported Account Types:</h5>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Business checking accounts</li>
                    <li>• Business savings accounts</li>
                    <li>• Business credit cards</li>
                    <li>• Business lines of credit</li>
                  </ul>
                </div>

                <Link to="/docs/bank-connections">
                  <Button variant="outline">
                    Learn About Bank Connections
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge variant="outline">4</Badge>
                  <span>Configure Your Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Set up your preferences, add team members, and configure notifications to 
                  get the most out of Auren.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">Basic Settings:</h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Default currency</li>
                      <li>• Fiscal year start</li>
                      <li>• Time zone</li>
                      <li>• Business type</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">Notifications:</h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Payment reminders</li>
                      <li>• Low cash alerts</li>
                      <li>• Payout notifications</li>
                      <li>• Weekly summaries</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Key Features Overview */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">What You Can Do Next</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              {keyFeatures.map((feature, index) => (
                <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      {feature.icon}
                      <h4 className="font-semibold">{feature.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 shadow-card">
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="text-2xl font-bold">Ready to Get Started?</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Follow the setup guide above and you'll be forecasting your Amazon cash flow 
                like a pro in no time. Our support team is always here to help if you get stuck.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-gradient-primary" onClick={() => navigate('/auth')}>
                  Start Setup Now
                </Button>
                <Button variant="outline" onClick={() => navigate('/schedule-demo')}>
                  Schedule a Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocsGettingStarted;