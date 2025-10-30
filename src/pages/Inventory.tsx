import { PublicLayout } from "@/components/PublicLayout";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, AlertTriangle, BarChart3, RefreshCw, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Inventory = () => {
  return (
    <PublicLayout activePage="inventory">
      <Helmet>
        <title>Inventory Management - Multi-Platform Stock Control | Auren</title>
        <meta name="description" content="Keep your products in stock across all ecommerce platforms with AI-powered inventory management. Similar to RestockPro but better." />
      </Helmet>

      {/* Hero Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Never Run Out of Stock Again
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Multi-platform inventory management that keeps your products in stock across Amazon, Walmart, Shopify, TikTok Shop, and more. All in one place.
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

      {/* Similar to RestockPro Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Like RestockPro, But Multi-Platform</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get the inventory management power you love, extended across all your selling channels
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Smart Restock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI-powered forecasting tells you exactly when to reorder, accounting for lead times and sales velocity across all platforms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertTriangle className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Low Stock Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get notified before you run out. Real-time alerts for products approaching stockout across Amazon, Walmart, Shopify and more.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Sales Velocity Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Understand how fast your inventory moves on each platform. Make data-driven decisions about where to allocate stock.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Complete Inventory Control</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Globe className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Multi-Platform Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Connect all your selling channels:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Amazon</strong> - FBA and FBM inventory tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Walmart</strong> - WFS and seller-fulfilled stock</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Shopify</strong> - All variants and locations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>TikTok Shop</strong> - Real-time inventory updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong>Whatnot</strong> - Live selling inventory</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <RefreshCw className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Automated Restock Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Our AI analyzes your sales data to recommend:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Optimal reorder quantities per SKU</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Best timing based on lead times</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Seasonal demand patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Platform-specific inventory allocation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Cost-optimized ordering strategies</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Optimize Your Inventory?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the waitlist to get early access to Auren Inventory when it launches.
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

export default Inventory;
