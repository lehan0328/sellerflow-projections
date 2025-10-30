import { PublicLayout } from "@/components/PublicLayout";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, TrendingUp, CheckCircle, Layers, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Accounting = () => {
  return (
    <PublicLayout activePage="accounting">
      <Helmet>
        <title>Ecommerce Accounting Integration - Like A2X & LinkMyBooks | Auren</title>
        <meta name="description" content="Properly separate ecommerce disbursement line items for accurate accounting. Similar to A2X and LinkMyBooks but for all platforms." />
      </Helmet>

      {/* Hero Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6 border border-amber-500/20">
              <Calculator className="h-4 w-4" />
              <span className="text-sm font-medium">Coming 2026</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent">
              Ecommerce Accounting Done Right
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Properly separate disbursement line items from Amazon, Walmart, Shopify and more. Professional-grade accounting for all your platforms.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-destructive/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Why Ecommerce Accounting is Different</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-lg mb-6 text-center">
                Traditional accounting doesn't work for ecommerce. Your disbursements contain dozens of line items that need proper categorization:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Revenue Items</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Product sales</li>
                    <li>• Shipping charges</li>
                    <li>• Gift wrap revenue</li>
                  </ul>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Expense Items</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• FBA/WFS fees</li>
                    <li>• Referral commissions</li>
                    <li>• Storage charges</li>
                  </ul>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Tax Items</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Sales tax collected</li>
                    <li>• Marketplace facilitator tax</li>
                    <li>• International VAT</li>
                  </ul>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Other Items</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Refunds & returns</li>
                    <li>• Reimbursements</li>
                    <li>• Promotional rebates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Our Solution */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">We Handle It All For You</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Layers className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Automatic Line Item Separation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Every disbursement is broken down into proper accounting categories:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Revenue posted to income accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Expenses categorized by type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Tax items properly segregated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>COGS tracking by SKU</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Refunds handled correctly</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>QuickBooks & Xero Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Direct integration with your accounting software:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Automatic journal entries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Customizable chart of accounts mapping</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Daily, weekly, or monthly sync</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Historical data import</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Tax-ready reports</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Accurate Financial Statements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Get real financials you can trust:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>True profit & loss statements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Balance sheet reconciliation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Cash flow statements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Month-end close ready</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Audit trail included</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Support */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">All Your Platforms, One Solution</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive support for all major ecommerce channels in one unified system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { name: "Amazon", desc: "FBA & FBM disbursements" },
              { name: "Walmart", desc: "WFS & Marketplace" },
              { name: "Shopify", desc: "All payment gateways" },
              { name: "TikTok Shop", desc: "Full transaction breakdown" },
              { name: "Whatnot", desc: "Live selling revenue" },
              { name: "eBay", desc: "Managed payments" }
            ].map((platform) => (
              <Card key={platform.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{platform.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why Proper Accounting Matters</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Save Time & Money</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Reduce accounting fees by 70%</li>
                  <li>• Eliminate manual data entry</li>
                  <li>• Monthly close in minutes, not days</li>
                  <li>• No more reconciliation nightmares</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Compliance Made Easy</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• IRS-compliant records automatically</li>
                  <li>• Sales tax properly tracked</li>
                  <li>• COGS documentation for every sale</li>
                  <li>• Audit-ready reports on demand</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-amber-500/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Coming in 2026
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Professional ecommerce accounting integration will be available next year.
          </p>
          <Link to="/contact">
            <Button size="lg" className="hover-scale">
              Get Notified
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Accounting;
