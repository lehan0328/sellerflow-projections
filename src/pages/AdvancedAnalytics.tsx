import { PublicLayout } from "@/components/PublicLayout";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, PieChart, LineChart, DollarSign, Percent } from "lucide-react";
import { Link } from "react-router-dom";

const AdvancedAnalytics = () => {
  return (
    <PublicLayout activePage="analytics">
      <Helmet>
        <title>Advanced Analytics & KPIs - Beyond Sellerboard | Auren</title>
        <meta name="description" content="Get deeper insights than Sellerboard with NOI, breakeven per unit, true PNL, and advanced KPIs that actually matter for your ecommerce business." />
      </Helmet>

      {/* Hero Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Analytics That Actually Matter
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Like Sellerboard, but with the KPIs that serious ecommerce sellers actually need. Track NOI, breakeven analysis, true PNL, and more.
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-16">
            <Link to="/signup">
              <Button size="lg" className="hover-scale">
                Join Waitlist
              </Button>
            </Link>
            <Link to="/schedule-demo">
              <Button size="lg" variant="outline" className="hover-scale">
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Beyond Basic Metrics</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sellerboard is great, but we're going deeper with KPIs that real businesses need for strategic decisions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <DollarSign className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Net Operating Income (NOI)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  See your real profitability after ALL expenses - not just Amazon fees.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>COGS tracking per SKU</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Operating expenses allocation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Marketing spend attribution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>True bottom line profitability</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Breakeven Per Unit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Know exactly what price you need to hit to break even on every product.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Product-level breakeven analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Minimum profitable price alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Dynamic cost recalculation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Profit margin optimization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PieChart className="h-8 w-8 text-primary mb-2" />
                <CardTitle>True P&L Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Complete profit and loss statements that include everything.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Revenue by channel and product</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Full cost accounting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Gross margin vs net margin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Export-ready for tax filing</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional KPIs */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">More Business-Critical KPIs</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <LineChart className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Advanced Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Customer Lifetime Value (CLV)</strong>
                      <p className="text-sm">Track repeat purchase patterns and customer value over time</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Inventory Turnover Rate</strong>
                      <p className="text-sm">See how efficiently you're moving inventory</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Return on Ad Spend (ROAS)</strong>
                      <p className="text-sm">True advertising performance with full cost attribution</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Days Sales Outstanding (DSO)</strong>
                      <p className="text-sm">Track how long it takes to collect revenue</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Percent className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Profitability Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Contribution Margin by SKU</strong>
                      <p className="text-sm">Understand which products drive real profit</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Operating Expense Ratio</strong>
                      <p className="text-sm">Keep overhead costs in check</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Cash Conversion Cycle</strong>
                      <p className="text-sm">Optimize your working capital efficiency</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong>Unit Economics Dashboard</strong>
                      <p className="text-sm">Per-unit profitability at a glance</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Multi-Platform Support */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Multi-Platform Analytics</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Get unified analytics across Amazon, Walmart, Shopify, TikTok Shop, and more. Compare performance across platforms and optimize where you sell.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["Amazon", "Walmart", "Shopify", "TikTok Shop", "Whatnot"].map((platform) => (
              <div key={platform} className="p-4 bg-background rounded-lg border">
                <p className="font-medium">{platform}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Make Better Business Decisions
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the waitlist to get early access to advanced analytics when it launches.
          </p>
          <Link to="/signup">
            <Button size="lg" className="hover-scale">
              Join Waitlist Now
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AdvancedAnalytics;
