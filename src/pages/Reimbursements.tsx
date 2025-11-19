import { PublicLayout } from "@/components/PublicLayout";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Upload, Zap, FileCheck, Shield, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Reimbursements = () => {
  return (
    <PublicLayout activePage="reimbursements">
      <Helmet>
        <title>Automated Reimbursements for Amazon & Walmart | Auren</title>
        <meta name="description" content="Fully automated FBA and WFS reimbursement tracking. Just upload invoices and let us handle the rest. Recover money from lost and damaged inventory." />
        <link rel="canonical" href="https://aurenapp.com/reimbursements" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://aurenapp.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Reimbursements",
                "item": "https://aurenapp.com/reimbursements"
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-6 border border-blue-500/20">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Get Every Dollar You're Owed
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Fully automated reimbursement tracking for Amazon FBA and Walmart WFS. Lost inventory, damaged goods, overcharged fees - we find it all.
            </p>
          </div>
        </div>
      </section>

      {/* Our Selling Point */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">100% Automated - Zero Work For You</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground text-lg mb-6">
                Unlike other reimbursement services, you don't need to do anything except upload your invoices once.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div>
                  <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold mb-2">1. Upload Invoices</h4>
                  <p className="text-sm text-muted-foreground">
                    Store your supplier invoices securely on our servers
                  </p>
                </div>
                <div>
                  <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold mb-2">2. We Do Everything</h4>
                  <p className="text-sm text-muted-foreground">
                    Our system automatically tracks and files claims 24/7
                  </p>
                </div>
                <div>
                  <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold mb-2">3. Get Your Money</h4>
                  <p className="text-sm text-muted-foreground">
                    Reimbursements appear directly in your account
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What We Track Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">What We Track For You</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <FileCheck className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Lost & Damaged Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  We continuously monitor your shipments and inventory for:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Lost items during inbound shipping</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Damaged products in FBA/WFS warehouses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Customer return discrepancies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Missing inventory from transfers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Disposed items you didn't authorize</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Fee Discrepancies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Automatically catch overcharges on:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>FBA fulfillment fees (wrong dimensions/weight)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Storage fees miscalculations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Referral fee errors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Removal order charges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Any duplicate charges</span>
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
          <h2 className="text-3xl font-bold text-center mb-12">Full Platform Coverage</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Amazon FBA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Complete reimbursement tracking for all Amazon marketplaces. We handle everything from inbound shipments to customer returns.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Walmart WFS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track Walmart Fulfillment Services claims automatically. Get reimbursed for lost and damaged inventory in WFS warehouses.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Your Data is Secure</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground text-lg">
                We use bank-grade encryption (AES-256) to store your invoices. Your supplier information and pricing data are completely secure and never shared.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-500/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Coming in 2026
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Automated reimbursement tracking will be available next year.
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

export default Reimbursements;
