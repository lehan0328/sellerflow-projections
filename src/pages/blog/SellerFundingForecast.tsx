import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const SellerFundingForecast = () => {
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
          "headline": "Use Forecasting Data to Qualify for Amazon Lending or 8fig Capital",
          "description": "Discover how accurate cashflow forecasting can strengthen your loan applications and unlock better financing terms for Amazon sellers.",
          "author": { "@type": "Organization", "name": "Auren Team" },
          "publisher": { "@type": "Organization", "name": "Auren", "logo": { "@type": "ImageObject", "url": "https://aurenapp.com/assets/logo.png" } },
          "datePublished": "2025-01-12",
          "mainEntityOfPage": { "@type": "WebPage", "@id": "https://aurenapp.com/blog/seller-funding-forecast" }
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
              Use Forecasting Data to Qualify for Amazon Lending or 8fig Capital
            </h1>

            <p className="text-sm text-muted-foreground mb-8" style={{ color: "#6b7280" }}>
              Published January 12, 2025 • 10 min read
            </p>

            <div className="space-y-6" style={{ fontSize: "17px", lineHeight: "1.75" }}>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Scaling an Amazon business often requires external capital—whether it&apos;s for inventory purchases, advertising campaigns, or hiring support staff. But qualifying for favorable financing isn&apos;t just about your sales numbers. Lenders want to see predictable cashflow and responsible financial management.
              </p>

              <p className="leading-relaxed">
                This is where cashflow forecasting becomes your secret weapon. Accurate forecasting data doesn&apos;t just help you run your business better—it dramatically improves your loan applications and can unlock better terms, lower rates, and higher credit limits.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Why Lenders Care About Cashflow Forecasting</h2>
              
              <p className="leading-relaxed">
                When you apply for Amazon Lending, 8fig, or any seller-focused financing, lenders evaluate your ability to repay the loan. They look at three key factors:
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Revenue consistency:</strong> Do you have stable, predictable sales?</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Cashflow visibility:</strong> Can you demonstrate when and how much cash you&apos;ll receive?</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Repayment ability:</strong> Will you have enough cash to cover loan payments without disrupting operations?</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                Sellers who can show accurate cashflow forecasts have a distinct advantage. They prove to lenders that they understand their business finances and can plan ahead—reducing perceived risk and improving approval odds.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">How Forecasting Strengthens Your Loan Application</h2>

              <h3 className="text-2xl font-semibold mt-8 mb-4">1. Show Historical Accuracy</h3>
              
              <p className="leading-relaxed">
                Lenders love data. When you can present 6-12 months of forecasted vs actual cashflow, you demonstrate financial discipline. This proves you&apos;re not just guessing—you have systems in place to manage money responsibly.
              </p>

              <Card className="my-6 bg-accent/5">
                <CardContent className="pt-6">
                  <p className="font-semibold mb-2">💡 Pro Tip:</p>
                  <p className="text-sm leading-relaxed">
                    Export your forecast accuracy report from Auren and include it in your loan application. Show lenders that your forecasts are consistently within 5% of actuals.
                  </p>
                </CardContent>
              </Card>

              <h3 className="text-2xl font-semibold mt-8 mb-4">2. Demonstrate Repayment Capacity</h3>

              <p className="leading-relaxed">
                Most Amazon-focused lenders (like 8fig or Clearco) use daily or weekly repayment schedules tied to your sales. With accurate cashflow forecasting, you can show exactly how much free cash you&apos;ll have available after covering:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Cost of goods sold (COGS)</li>
                <li>Amazon fees and advertising</li>
                <li>Existing loan payments</li>
                <li>Operating expenses</li>
              </ul>

              <p className="leading-relaxed">
                This level of transparency reduces lender risk and can result in higher approval amounts.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">3. Optimize Your Loan Timing</h3>

              <p className="leading-relaxed">
                Applying for financing at the wrong time can hurt your application. If you apply during a seasonal dip or right before a large expense, your numbers may look less favorable. Forecasting helps you identify the optimal window to apply—when your cashflow is strong and predictable.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Real Example: How One Seller Unlocked $50k with Forecasting Data</h2>

              <Card className="my-8 bg-primary/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="leading-relaxed">
                    Sarah, a private-label seller doing $80k/month, was initially denied by Amazon Lending. Her sales were inconsistent due to poor inventory planning, and she couldn&apos;t show predictable cashflow.
                  </p>
                  <p className="leading-relaxed">
                    After implementing cashflow forecasting, she stabilized her inventory purchases and demonstrated 6 months of accurate forecasts. When she reapplied with 8fig, she included:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>A 90-day cashflow forecast showing stable inflows</li>
                    <li>Proof of forecast accuracy (within 3% variance)</li>
                    <li>A repayment plan aligned with her payout schedule</li>
                  </ul>
                  <p className="leading-relaxed">
                    Result: Approved for $50k at 1.2% weekly cost—significantly better than her first attempt.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Documents Lenders Want to See</h2>

              <p className="leading-relaxed">
                When applying for seller financing, prepare these forecasting-related documents:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li><strong>90-day cashflow forecast:</strong> Shows projected inflows, outflows, and net cash position</li>
                <li><strong>Historical forecast accuracy report:</strong> Compares your past forecasts to actual results</li>
                <li><strong>Payout schedule:</strong> Details when Amazon settlements hit your account</li>
                <li><strong>Repayment capacity analysis:</strong> Shows how much free cash you&apos;ll have after expenses</li>
              </ul>

              <h2 className="text-3xl font-bold mt-12 mb-6">Alternative Financing Options That Value Forecasting</h2>

              <p className="leading-relaxed">
                Beyond Amazon Lending, these financing providers prioritize cashflow predictability:
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ul className="space-y-4">
                    <li>
                      <strong className="text-lg">8fig</strong>
                      <p className="text-sm text-muted-foreground mt-1">Flexible growth capital tied to your sales with AI-powered repayment schedules</p>
                    </li>
                    <li>
                      <strong className="text-lg">Clearco</strong>
                      <p className="text-sm text-muted-foreground mt-1">Revenue-based financing specifically for ecommerce sellers</p>
                    </li>
                    <li>
                      <strong className="text-lg">Funding Circle</strong>
                      <p className="text-sm text-muted-foreground mt-1">Term loans for established sellers with strong cashflow history</p>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Action Steps</h2>

              <p className="leading-relaxed">
                To use forecasting data for better financing:
              </p>

              <ol className="list-decimal pl-6 space-y-3 my-6">
                <li>Start tracking your cashflow forecasts today—aim for at least 3 months of data</li>
                <li>Compare forecasts to actuals monthly to build credibility</li>
                <li>Create a 90-day forward-looking forecast before applying for loans</li>
                <li>Include forecast accuracy reports in your applications</li>
                <li>Time your applications during periods of strong, stable cashflow</li>
              </ol>
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
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/financing-growth')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">Use Cashflow Forecasts to Secure Financing</h3>
                    <p className="text-xs text-muted-foreground">Turn your forecasts into better funding terms.</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/forecast-amazon-payouts')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">How to Forecast Amazon Payouts with Accuracy</h3>
                    <p className="text-xs text-muted-foreground">Master data-driven payout prediction.</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/scaling-to-seven-figures')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">Scale to 7 Figures with Cashflow Visibility</h3>
                    <p className="text-xs text-muted-foreground">Real strategies from successful sellers.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CTA */}
            <Card className="mt-12 bg-gradient-to-br from-primary/10 to-accent/10 border-none" style={{ borderRadius: "12px", marginTop: "3rem" }}>
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">Build Lender-Ready Forecasts Automatically</h3>
                <p className="text-muted-foreground">
                  Auren generates investor-grade cashflow forecasts that strengthen your loan applications. 
                  Export reports that show lenders exactly what they want to see.
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

export default SellerFundingForecast;
