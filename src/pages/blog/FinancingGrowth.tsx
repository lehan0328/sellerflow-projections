import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, TrendingUp, CheckCircle } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const FinancingGrowth = () => {
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
          "headline": "How to Use Cashflow Forecasts to Secure Seller Financing",
          "description": "Learn how Amazon sellers can use cashflow forecasts to qualify for better funding and present predictable revenue to lenders.",
          "author": { "@type": "Organization", "name": "Auren Team" },
          "publisher": { "@type": "Organization", "name": "Auren", "logo": { "@type": "ImageObject", "url": "https://aurenapp.com/assets/logo.png" } },
          "datePublished": "2025-10-01",
          "mainEntityOfPage": { "@type": "WebPage", "@id": "https://aurenapp.com/blog/financing-growth" }
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

            <Badge className="bg-green-500/10 text-green-600 mb-4">Financing</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              How to Use Cashflow Forecasts to Secure Seller Financing
            </h1>

            <p className="text-sm text-muted-foreground mb-8" style={{ color: "#6b7280" }}>
              Published October 2025 • 8 min read
            </p>

            <div className="space-y-6" style={{ fontSize: "17px", lineHeight: "1.75" }}>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Access to funding can transform your Amazon business — enabling larger restocks, faster product launches, and better ad visibility. But most lenders and platforms require proof of stable, predictable cashflow. That&apos;s where forecasting comes in.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">1. Show Predictable Revenue Trends</h2>
              
              <p className="leading-relaxed">
                Lenders prefer consistency over spikes. Auren&apos;s historical payout charts show your average monthly sales and predict future disbursements, demonstrating stable performance and reducing perceived lending risk.
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">What Lenders Look For:</p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Consistent month-over-month revenue growth</li>
                          <li>• Predictable payout amounts (not wild fluctuations)</li>
                          <li>• Low refund and chargeback rates</li>
                          <li>• Stable or improving profit margins</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                When you can present 6-12 months of forecasted vs actual cashflow data, you prove to lenders that you understand your business finances and can plan ahead — significantly reducing their risk.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">2. Highlight Seasonal Cashflow Patterns</h2>

              <p className="leading-relaxed">
                If you experience high Q4 sales or slow summers, forecasts reveal how you manage liquidity through fluctuations. Showing proactive cash management builds lender confidence.
              </p>

              <p className="leading-relaxed">
                Don&apos;t hide seasonality — embrace it. Lenders understand that Amazon businesses have peaks and valleys. What they want to see is that you&apos;ve planned for these variations and maintained positive cashflow year-round.
              </p>

              <Card className="my-8 bg-accent/5">
                <CardContent className="pt-6">
                  <p className="font-semibold mb-2">💡 Pro Tip:</p>
                  <p className="text-sm">
                    Use Auren to export a year-over-year comparison showing how you managed Q4 spikes and Q1 slowdowns. This demonstrates financial sophistication and reduces lender concerns about seasonal risk.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">3. Use Forecasts to Determine Loan Timing</h2>

              <p className="leading-relaxed">
                When you know your upcoming payouts, you can plan the best moment to apply for financing — ensuring repayment won&apos;t strain future cash availability. Auren helps visualize these scenarios instantly.
              </p>

              <p className="leading-relaxed">
                Timing matters more than most sellers realize. Apply for a loan when you&apos;re cash-poor, and you&apos;ll struggle with immediate repayments. Apply when you have strong incoming payouts, and you can negotiate better terms.
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li><strong>Bad timing:</strong> Applying right before a supplier payment is due</li>
                <li><strong>Bad timing:</strong> Applying during a seasonal sales dip</li>
                <li><strong>Good timing:</strong> Applying after a strong sales month with predictable upcoming payouts</li>
                <li><strong>Good timing:</strong> Applying before Q4 with data showing past holiday performance</li>
              </ul>

              <h2 className="text-3xl font-bold mt-12 mb-6">4. Compare Different Funding Options</h2>

              <p className="leading-relaxed">
                Short-term advances, revolving credit, or Amazon Lending all have unique repayment cycles. Pairing forecasts with financing terms lets you calculate impact on future balances before you accept an offer.
              </p>

              <Card className="my-8">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="font-semibold">Amazon Lending</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Daily automatic deductions from payouts. Good if your sales are stable. Risky if sales drop unexpectedly.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Revenue-Based Financing (Clearco, 8fig)</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Flexible repayment tied to sales. Better for seasonal businesses. Requires strong forecasting to maximize value.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Term Loans (Funding Circle, OnDeck)</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fixed monthly payments. Best for stable businesses with predictable cashflow. Use forecasts to ensure you can always make payments.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                With Auren, you can model each scenario: &quot;If I take a $50k loan with daily repayments, will I still have enough cash for inventory orders next month?&quot; Answer these questions before you sign.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">5. Present Professional Financial Reports</h2>

              <p className="leading-relaxed">
                Download Auren&apos;s payout forecasts and cash summaries to include in your funding applications. Showing lenders data-backed projections improves approval odds and helps negotiate better rates.
              </p>

              <Card className="my-8 bg-primary/5">
                <CardContent className="pt-6">
                  <p className="font-semibold mb-3">What to Include in Your Application:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm"><strong>90-day cashflow forecast</strong> showing expected inflows and outflows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm"><strong>Historical accuracy report</strong> comparing past forecasts to actual results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm"><strong>Payout schedule</strong> showing when Amazon payments hit your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm"><strong>Repayment capacity analysis</strong> demonstrating available cash after expenses</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Real Example: Securing Better Terms with Data</h2>

              <p className="leading-relaxed">
                James, a kitchen gadget seller doing $120k/month, was initially offered Amazon Lending at a 12% factor rate (meaning he&apos;d pay $12k in fees to borrow $100k). He felt it was too expensive but had no alternatives.
              </p>

              <p className="leading-relaxed">
                Using Auren, he generated a detailed cashflow forecast showing:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Consistent 15% month-over-month growth for 8 months</li>
                <li>Predictable payouts within 3% variance</li>
                <li>Enough free cash to comfortably handle loan repayments</li>
                <li>A plan for how the $100k would generate additional revenue</li>
              </ul>

              <p className="leading-relaxed">
                He applied to Clearco with this data and received an offer at 8% — saving $4,000 in fees. The difference? Professional financial presentation backed by accurate forecasting.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Taking Action</h2>

              <p className="leading-relaxed">
                Predictable cashflow earns trust. Lenders don&apos;t just want to see sales numbers — they want to see that you understand your finances and can manage debt responsibly.
              </p>

              <p className="leading-relaxed">
                Start forecasting today, even if you&apos;re not seeking financing yet. Build 3-6 months of historical accuracy. When you&apos;re ready to apply, you&apos;ll have the data lenders want to see — and the confidence to negotiate better terms.
              </p>
            </div>

            {/* Author Bio */}
            <Card className="mt-12 bg-muted/30" style={{ borderRadius: "12px", marginTop: "3rem" }}>
              <CardContent className="p-6" style={{ padding: "1.5rem" }}>
                <h3 className="text-lg font-bold mb-3">About the Author</h3>
                <p className="leading-relaxed mb-2">
                  <strong>The Auren Team</strong> helps Amazon and eCommerce sellers master cashflow forecasting and make smarter financial decisions. 
                  We&apos;re on a mission to make business cash management simple, automated, and stress-free.
                </p>
                <p className="text-sm">
                  Learn more at <a href="/" className="text-primary hover:underline">aurenapp.com</a>
                </p>
              </CardContent>
            </Card>

            {/* Related Articles */}
            <div className="mt-12" style={{ marginTop: "3rem" }}>
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid gap-6 md:grid-cols-3" style={{ gap: "1.5rem" }}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/forecast-amazon-payouts')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">How to Forecast Amazon Payouts with Accuracy</h3>
                    <p className="text-xs text-muted-foreground">Learn the data-driven method to predict disbursements.</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/seller-funding-forecast')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">Qualify for Amazon Lending or 8fig Capital</h3>
                    <p className="text-xs text-muted-foreground">Use forecasting to access better funding terms.</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/scaling-to-seven-figures')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">Scale Your Business to 7 Figures</h3>
                    <p className="text-xs text-muted-foreground">Cashflow visibility fuels sustainable growth.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CTA */}
            <Card className="mt-12 bg-gradient-to-br from-primary/10 to-accent/10 border-none" style={{ borderRadius: "12px", marginTop: "3rem" }}>
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">Build Lender-Ready Cashflow Reports</h3>
                <p className="text-muted-foreground">
                  Auren generates professional financial forecasts that strengthen your loan applications. 
                  Show lenders exactly what they want to see — predictable, data-backed projections.
                </p>
                <Button size="lg" className="bg-gradient-primary font-bold" onClick={() => navigate('/')} style={{ borderRadius: "0.5rem" }}>
                  Start Free Trial
                </Button>
                <p className="text-sm text-muted-foreground">No credit card required • Cancel anytime</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>
    </div>
  );
};

export default FinancingGrowth;
