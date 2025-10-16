import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  ShoppingCart, 
  Globe,
  FileText,
  AlertCircle,
  Shield,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Settings,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const DocsAmazonIntegration = () => {
  const navigate = useNavigate();

  const marketplaces = [
    { code: "US", name: "United States", flag: "🇺🇸", supported: true },
    { code: "CA", name: "Canada", flag: "🇨🇦", supported: true },
    { code: "MX", name: "Mexico", flag: "🇲🇽", supported: true },
    { code: "UK", name: "United Kingdom", flag: "🇬🇧", supported: true },
    { code: "DE", name: "Germany", flag: "🇩🇪", supported: true },
    { code: "FR", name: "France", flag: "🇫🇷", supported: true },
    { code: "IT", name: "Italy", flag: "🇮🇹", supported: true },
    { code: "ES", name: "Spain", flag: "🇪🇸", supported: true },
    { code: "AU", name: "Australia", flag: "🇦🇺", supported: true },
    { code: "JP", name: "Japan", flag: "🇯🇵", supported: true },
    { code: "IN", name: "India", flag: "🇮🇳", supported: false },
    { code: "BR", name: "Brazil", flag: "🇧🇷", supported: false }
  ];

  const features = [
    {
      title: "Automatic Payout Forecasting",
      description: "Predict your next Amazon payout down to the day",
      icon: <Calendar className="h-5 w-5 text-primary" />,
      accuracy: "95%+ accuracy"
    },
    {
      title: "Settlement Report Import", 
      description: "Automatically import and categorize all transactions",
      icon: <FileText className="h-5 w-5 text-success" />,
      accuracy: "Real-time sync"
    },
    {
      title: "Multi-Marketplace Support",
      description: "Manage all your Amazon regions in one place",
      icon: <Globe className="h-5 w-5 text-accent" />,
      accuracy: "10+ marketplaces"
    },
    {
      title: "Fee Analysis",
      description: "Track and optimize your Amazon fees",
      icon: <TrendingUp className="h-5 w-5 text-muted-foreground" />,
      accuracy: "Detailed breakdown"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Amazon Integration - Connect Your Seller Account | Auren</title>
        <meta name="description" content="Connect your Amazon Seller Central account to Auren for automatic payout forecasting and marketplace cashflow management. Secure SP-API integration guide." />
        <meta name="keywords" content="amazon seller integration, amazon sp-api connection, marketplace payout sync" />
        <link rel="canonical" href="https://aurenapp.com/docs/amazon-integration" />
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
                  <ShoppingCart className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Amazon Integration</h1>
                  <p className="text-muted-foreground text-sm">Connect your Amazon Seller Central account</p>
                </div>
              </div>
            </div>
            <Button size="sm" className="bg-gradient-primary" onClick={() => navigate('/auth')}>
              Connect Amazon
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <div className="space-y-4">
            <Badge variant="secondary" className="mb-4">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Amazon SP-API Integration
            </Badge>
            <h2 className="text-3xl font-bold">Amazon Seller Central Integration</h2>
            <p className="text-xl text-muted-foreground">
              Connect your Amazon seller account to unlock powerful cash flow forecasting 
              and automatically sync your payout data across all marketplaces.
            </p>
          </div>

          {/* Security Alert */}
          <Alert className="border-success/20 bg-success/10">
            <Shield className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              <strong>100% Secure:</strong> We use Amazon's official SP-API with read-only access. 
              Your credentials are never stored, and we cannot make any changes to your seller account.
            </AlertDescription>
          </Alert>

          {/* Features Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    {feature.icon}
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <Badge variant="outline" className="text-xs">{feature.accuracy}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Setup Guide */}
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="marketplaces">Marketplaces</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Step-by-Step Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">1</Badge>
                      <h4 className="font-semibold">Go to Amazon Developer Console</h4>
                    </div>
                    <p className="text-muted-foreground ml-11">
                      Visit the Amazon Developer Console to create an app for Auren integration.
                    </p>
                    <div className="ml-11">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Developer Console
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 2 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">2</Badge>
                      <h4 className="font-semibold">Create a New App</h4>
                    </div>
                    <div className="ml-11 space-y-3">
                      <p className="text-muted-foreground">
                        Create a new app with the following configuration:
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="space-y-2 text-sm">
                          <div><strong>App Name:</strong> Auren Integration</div>
                          <div><strong>Data Access:</strong> SP-API</div>
                          <div><strong>Use Case:</strong> Analytics, Business Intelligence</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 3 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">3</Badge>
                      <h4 className="font-semibold">Copy Your Credentials</h4>
                    </div>
                    <div className="ml-11 space-y-3">
                      <p className="text-muted-foreground">
                        Copy the following credentials from your Amazon app:
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="space-y-2 text-sm">
                          <div>• <strong>Client ID</strong></div>
                          <div>• <strong>Client Secret</strong></div>
                          <div>• <strong>Refresh Token</strong></div>
                          <div>• <strong>Seller ID</strong></div>
                        </div>
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Keep these credentials secure. Never share them or store them in unsecured locations.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 4 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">4</Badge>
                      <h4 className="font-semibold">Add to Auren</h4>
                    </div>
                    <div className="ml-11 space-y-3">
                      <p className="text-muted-foreground">
                        In your Auren settings, add your Amazon account using the credentials above.
                      </p>
                      <Button className="bg-gradient-primary" onClick={() => navigate('/settings')}>
                        <Settings className="h-4 w-4 mr-2" />
                        Go to Amazon Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="marketplaces" className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Supported Marketplaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {marketplaces.map((marketplace, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          marketplace.supported ? 'bg-success/5 border-success/20' : 'bg-muted/50 border-muted'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{marketplace.flag}</span>
                          <div>
                            <h4 className="font-medium">{marketplace.name}</h4>
                            <p className="text-sm text-muted-foreground">Amazon {marketplace.code}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={marketplace.supported ? "default" : "secondary"}
                          className={marketplace.supported ? "bg-success" : ""}
                        >
                          {marketplace.supported ? "Supported" : "Coming Soon"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <Alert className="mt-6">
                    <Globe className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Multi-Region Support:</strong> You can connect multiple Amazon marketplaces 
                      to get a complete view of your global Amazon business.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-success" />
                      <span>Payout Forecasting</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Our advanced algorithms analyze your Amazon sales patterns and predict future payouts with 95%+ accuracy.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Next Payout</span>
                        <Badge variant="outline">Dec 15, 2024</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Estimated Amount</span>
                        <Badge variant="outline">$12,450</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Confidence</span>
                        <Badge className="bg-success">96%</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 text-primary" />
                      <span>Real-time Sync</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Automatically sync your settlement reports and transaction data every hour.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Last Sync</span>
                        <Badge variant="outline">2 minutes ago</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sync Frequency</span>
                        <Badge variant="outline">Every hour</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Status</span>
                        <Badge className="bg-success">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-accent" />
                      <span>Settlement Reports</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Import and categorize all Amazon transactions automatically from settlement reports.
                    </p>
                    <div className="space-y-2">
                      <div>• Product sales revenue</div>
                      <div>• Referral fees</div>
                      <div>• FBA fees</div>
                      <div>• Refunds and returns</div>
                      <div>• Advertising costs</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <span>Analytics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Deep insights into your Amazon business performance and trends.
                    </p>
                    <div className="space-y-2">
                      <div>• Revenue trends</div>
                      <div>• Fee optimization</div>
                      <div>• Seasonal patterns</div>
                      <div>• Marketplace comparison</div>
                      <div>• Profitability analysis</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="troubleshooting" className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Common Issues & Solutions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Connection Failed</h4>
                    <p className="text-muted-foreground">
                      If you're unable to connect your Amazon account, try these steps:
                    </p>
                    <ul className="space-y-2 text-sm ml-4">
                      <li>• Verify all credentials are copied correctly</li>
                      <li>• Check that your app has SP-API access enabled</li>
                      <li>• Ensure your seller account is in good standing</li>
                      <li>• Wait 24 hours after creating your Amazon app</li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Data Not Syncing</h4>
                    <p className="text-muted-foreground">
                      If your Amazon data isn't updating:
                    </p>
                    <ul className="space-y-2 text-sm ml-4">
                      <li>• Check the last sync time in your account settings</li>
                      <li>• Verify your Amazon app permissions</li>
                      <li>• Look for any error messages in the sync logs</li>
                      <li>• Try disconnecting and reconnecting your account</li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Missing Marketplace Data</h4>
                    <p className="text-muted-foreground">
                      If some marketplaces aren't showing data:
                    </p>
                    <ul className="space-y-2 text-sm ml-4">
                      <li>• Add each marketplace separately in settings</li>
                      <li>• Verify you have selling permissions in that region</li>
                      <li>• Check that you have recent transactions in that marketplace</li>
                      <li>• Allow 24-48 hours for initial data import</li>
                    </ul>
                  </div>

                  <Alert className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Still need help?</strong> Contact our support team with your account details 
                      and we'll help you get connected within 24 hours.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Next Steps */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 shadow-card">
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="text-2xl font-bold">Ready to Connect Amazon?</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start forecasting your Amazon cash flow with 95%+ accuracy. 
                The integration takes less than 10 minutes to complete.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-gradient-primary" onClick={() => navigate('/settings')}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Connect Amazon Now
                </Button>
                <Button variant="outline" onClick={() => navigate('/docs/bank-connections')}>
                  Next: Bank Connections
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocsAmazonIntegration;