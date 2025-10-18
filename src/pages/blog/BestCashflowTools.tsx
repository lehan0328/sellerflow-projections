import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Check, X } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";

const BestCashflowTools = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover-scale transition-all duration-300" 
              onClick={() => navigate('/')}
            >
              <img src={aurenIcon} alt="Auren" className="h-12 w-12" />
              <span className="text-2xl font-bold">Auren</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/blog')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </div>
        </div>
      </nav>

      {/* Schema.org Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": "Best Cashflow Tools for Marketplace Sellers in 2025",
          "description": "A comprehensive comparison of the top cashflow management tools built specifically for Amazon and multi-channel sellers.",
          "author": { "@type": "Organization", "name": "Auren Team" },
          "publisher": { "@type": "Organization", "name": "Auren", "logo": { "@type": "ImageObject", "url": "https://aurenapp.com/assets/logo.png" } },
          "datePublished": "2025-01-05",
          "mainEntityOfPage": { "@type": "WebPage", "@id": "https://aurenapp.com/blog/best-cashflow-tools" }
        })}
      </script>

      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto" style={{ maxWidth: "780px" }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/blog')}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>

            <Badge className="bg-orange-500/10 text-orange-600 mb-4">Tools</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Best Cashflow Tools for Marketplace Sellers in 2025
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-12">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>January 5, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>15 min read</span>
              </div>
            </div>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-xl text-muted-foreground leading-relaxed">
                Managing cashflow as an Amazon or multi-channel seller requires more than spreadsheets. As your business grows, you need specialized tools that understand marketplace payout schedules, inventory cycles, and the unique financial challenges of ecommerce. In this comprehensive guide, we&apos;ll compare the top cashflow management tools for sellers in 2025.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">What to Look for in a Cashflow Tool</h2>
              
              <p className="leading-relaxed">
                Before diving into specific tools, let&apos;s establish the key features that matter for marketplace sellers:
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Amazon integration:</strong> Direct connection to Seller Central for automatic payout tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Bank connections:</strong> Sync checking and credit card accounts to track actual cash</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Forward-looking forecasts:</strong> Predict future cash position, not just historical reports</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Inventory planning integration:</strong> Link restocks to cashflow impact</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Multi-channel support:</strong> Track Walmart, Shopify, and other platforms</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">The Top 5 Cashflow Tools for Sellers</h2>

              <h3 className="text-2xl font-semibold mt-8 mb-4">1. Auren — Best for Amazon Payout Forecasting</h3>

              <Card className="my-6">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Daily Amazon payout forecasts with 95% accuracy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">90-day rolling cashflow projection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Bank and credit card integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Scenario planning for &quot;what-if&quot; analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Multi-marketplace support (US, UK, EU, etc.)</span>
                    </li>
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-sm"><strong>Best for:</strong> Sellers who need accurate payout forecasting and want to eliminate cashflow surprises</p>
                    <p className="text-sm mt-2"><strong>Pricing:</strong> Starting at $29/month</p>
                  </div>
                </CardContent>
              </Card>

              <h3 className="text-2xl font-semibold mt-8 mb-4">2. QuickBooks Online — Best for Full Accounting Integration</h3>

              <Card className="my-6">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Full double-entry accounting system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Invoice and expense management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Tax preparation features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">No native Amazon payout forecasting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">Complex setup for ecommerce sellers</span>
                    </li>
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-sm"><strong>Best for:</strong> Sellers who need comprehensive accounting software, not just cashflow tracking</p>
                    <p className="text-sm mt-2"><strong>Pricing:</strong> Starting at $30/month</p>
                  </div>
                </CardContent>
              </Card>

              <h3 className="text-2xl font-semibold mt-8 mb-4">3. Float — Best for Multi-Currency Sellers</h3>

              <Card className="my-6">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Connects to QuickBooks for cashflow visualization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Multi-currency support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Scenario modeling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">Requires QuickBooks subscription</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">Not Amazon-specific</span>
                    </li>
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-sm"><strong>Best for:</strong> International sellers managing multiple currencies</p>
                    <p className="text-sm mt-2"><strong>Pricing:</strong> Starting at $49/month</p>
                  </div>
                </CardContent>
              </Card>

              <h3 className="text-2xl font-semibold mt-8 mb-4">4. A2X — Best for Amazon Transaction Reconciliation</h3>

              <Card className="my-6">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Detailed Amazon settlement breakdown</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Automatic reconciliation with accounting software</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">COGS tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">Historical focus, not forward-looking forecasts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">Requires separate accounting software</span>
                    </li>
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-sm"><strong>Best for:</strong> Sellers who need detailed Amazon transaction reconciliation for tax purposes</p>
                    <p className="text-sm mt-2"><strong>Pricing:</strong> Starting at $19/month</p>
                  </div>
                </CardContent>
              </Card>

              <h3 className="text-2xl font-semibold mt-8 mb-4">5. Pulse — Best for Visual Cashflow Reports</h3>

              <Card className="my-6">
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Beautiful cashflow charts and graphs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Integrates with QuickBooks and Xero</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Simple, easy-to-use interface</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">No Amazon-specific features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-1" />
                      <span className="text-sm">Limited forecasting depth</span>
                    </li>
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-sm"><strong>Best for:</strong> Small businesses that want simple cashflow visualization</p>
                    <p className="text-sm mt-2"><strong>Pricing:</strong> $29/month</p>
                  </div>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Quick Comparison Table</h2>

              <div className="overflow-x-auto my-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Tool</th>
                      <th className="text-left p-3 font-semibold">Amazon Integration</th>
                      <th className="text-left p-3 font-semibold">Payout Forecasting</th>
                      <th className="text-left p-3 font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">Auren</td>
                      <td className="p-3">✅ Native</td>
                      <td className="p-3">✅ 90 days</td>
                      <td className="p-3">$29+</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">QuickBooks</td>
                      <td className="p-3">⚠️ Via apps</td>
                      <td className="p-3">❌ Manual</td>
                      <td className="p-3">$30+</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Float</td>
                      <td className="p-3">❌ No</td>
                      <td className="p-3">⚠️ Basic</td>
                      <td className="p-3">$49+</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">A2X</td>
                      <td className="p-3">✅ Native</td>
                      <td className="p-3">❌ Historical only</td>
                      <td className="p-3">$19+</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Pulse</td>
                      <td className="p-3">❌ No</td>
                      <td className="p-3">⚠️ Basic</td>
                      <td className="p-3">$29</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-3xl font-bold mt-12 mb-6">Which Tool Is Right for You?</h2>

              <Card className="my-8">
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <p className="font-semibold mb-2">Choose Auren if:</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;re an Amazon seller who needs accurate payout forecasting and wants to avoid cashflow surprises
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Choose QuickBooks if:</p>
                    <p className="text-sm text-muted-foreground">
                      You need full accounting software with invoicing, payroll, and tax features
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Choose Float if:</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;re already using QuickBooks and need better cashflow visualization
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Choose A2X if:</p>
                    <p className="text-sm text-muted-foreground">
                      Your primary need is accurate Amazon transaction reconciliation for tax purposes
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Choose Pulse if:</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;re a small business (not Amazon-focused) that wants simple cashflow reports
                    </p>
                  </div>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Final Recommendation</h2>

              <p className="leading-relaxed">
                For Amazon and marketplace sellers, we recommend starting with a tool purpose-built for ecommerce cashflow like Auren. Unlike generic accounting software, Auren understands Amazon&apos;s payout schedule, reserve systems, and the unique challenges of seller cashflow.
              </p>

              <p className="leading-relaxed">
                If you need full accounting features (invoicing, payroll, etc.), consider using Auren for cashflow forecasting alongside QuickBooks for general accounting. Many sellers find this combination gives them the best of both worlds.
              </p>
            </div>

            <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">
                  Try Auren Free for 7 Days
                </h3>
                <p className="text-muted-foreground">
                  See why Amazon sellers choose Auren for accurate payout forecasting. 
                  Connect your Seller Central account and get your first forecast in minutes.
                </p>
                <Button size="lg" className="bg-gradient-primary" onClick={() => navigate('/')}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>
    </div>
  );
};

export default BestCashflowTools;
