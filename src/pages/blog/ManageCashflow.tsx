import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, AlertTriangle } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const ManageCashflow = () => {
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
          "headline": "5 Cashflow Mistakes Every Amazon Seller Should Avoid",
          "description": "Avoid the most common Amazon cashflow mistakes — from overspending on ads to ignoring payout delays. Learn proven management strategies.",
          "author": { "@type": "Organization", "name": "Auren Team" },
          "publisher": { "@type": "Organization", "name": "Auren", "logo": { "@type": "ImageObject", "url": "https://aurenapp.com/assets/logo.png" } },
          "datePublished": "2025-10-01",
          "mainEntityOfPage": { "@type": "WebPage", "@id": "https://aurenapp.com/blog/manage-cashflow" }
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

            <Badge className="bg-red-500/10 text-red-600 mb-4">Management</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              5 Cashflow Mistakes Every Amazon Seller Should Avoid
            </h1>

            <p className="text-sm text-muted-foreground mb-8" style={{ color: "#6b7280" }}>
              Published October 2025 • 7 min read
            </p>

            <div className="space-y-6" style={{ fontSize: "17px", lineHeight: "1.75" }}>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Even profitable Amazon businesses can run into cash crunches. The problem usually isn&apos;t low sales — it&apos;s poor cashflow management. Here are the top five mistakes that keep sellers stuck and how to avoid them.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">1. Ignoring Amazon&apos;s Payout Delays</h2>
              
              <p className="leading-relaxed">
                Amazon disburses every 14 days, but reserves and holds can extend that period. Many sellers forget that today&apos;s sales might not become available cash for weeks. Forecasting helps you plan around this delay and stay solvent.
              </p>

              <Card className="my-8 bg-destructive/5">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Common Scenario:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You make $50k in sales this week and immediately place a $40k inventory order. But Amazon won&apos;t pay you for another 14 days, and your supplier needs payment in 7 days. You&apos;re now scrambling for bridge financing at high interest rates.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                <strong>The fix:</strong> Use tools like Auren to see exactly when your next payout will arrive and plan major expenses accordingly. Never spend money you haven&apos;t received yet.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">2. Overspending on Advertising</h2>

              <p className="leading-relaxed">
                PPC campaigns can drain liquidity if not monitored closely. Always align ad budgets with your payout schedule so you don&apos;t run out of working capital between disbursements.
              </p>

              <p className="leading-relaxed">
                Many sellers set aggressive daily budgets during launches or seasonal peaks, then find themselves cash-strapped before the next payout. Amazon charges advertising fees separately from product sales, which can create timing gaps.
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <p className="font-semibold mb-3">Smart Ad Budget Strategy:</p>
                  <ul className="space-y-2 text-sm">
                    <li>• Set ad budgets to no more than 15-20% of expected payout</li>
                    <li>• Increase budgets only after payouts arrive, not before</li>
                    <li>• Use Auren to forecast how ad spend will impact available cash</li>
                    <li>• Keep a buffer for unexpected costs (returns, chargebacks)</li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">3. Restocking Too Early (or Too Late)</h2>

              <p className="leading-relaxed">
                Ordering inventory too early ties up cash; ordering too late risks stockouts. The key is balancing turnover with forecasted inflows — something Auren&apos;s dashboard visualizes clearly.
              </p>

              <p className="leading-relaxed">
                Early reorders mean you&apos;re paying for inventory that won&apos;t sell for weeks or months, locking up capital you could use elsewhere. Late reorders mean you lose sales, rankings drop, and competitors gain ground.
              </p>

              <p className="leading-relaxed">
                The solution is inventory forecasting tied to cashflow forecasting. Know exactly when you&apos;ll need to reorder AND when you&apos;ll have the cash to pay for it.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">4. Mixing Personal and Business Accounts</h2>

              <p className="leading-relaxed">
                Commingling funds makes it nearly impossible to track real cashflow. Use dedicated business accounts and sync them with Auren to view accurate daily balances.
              </p>

              <Card className="my-8 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Why This Matters:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        When personal and business expenses share the same account, you can&apos;t accurately forecast how much cash your business truly has. You might think you have $20k available, but $8k of that is actually for personal expenses. This leads to overdrafts, missed payments, and financial stress.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                <strong>The fix:</strong> Open a dedicated business checking account. Pay yourself a regular &quot;salary&quot; from business to personal. This creates a clear boundary and makes forecasting accurate.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">5. Relying on Spreadsheets</h2>

              <p className="leading-relaxed">
                Manual tracking is slow, error-prone, and lacks predictive power. Modern sellers automate forecasting — Auren updates your cashflow daily, showing exactly how long your funds will last and when you&apos;ll get paid next.
              </p>

              <p className="leading-relaxed">
                Spreadsheets require constant manual updates. Miss one day, and your forecast is outdated. Make one formula error, and your entire projection is wrong. Plus, spreadsheets can&apos;t connect to your bank accounts or Amazon Seller Central automatically.
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li><strong>Problem:</strong> Static data that&apos;s always outdated</li>
                <li><strong>Problem:</strong> No connection to real-time sales or payouts</li>
                <li><strong>Problem:</strong> Hours of manual data entry every week</li>
                <li><strong>Problem:</strong> No alerts when you&apos;re about to run low on cash</li>
              </ul>

              <p className="leading-relaxed">
                <strong>The fix:</strong> Use automated cashflow software like Auren that connects to your Amazon account and updates forecasts automatically. Spend your time growing your business, not updating spreadsheets.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Taking Action</h2>

              <p className="leading-relaxed">
                Cashflow mastery separates growing brands from those constantly playing catch-up. The good news? All five of these mistakes are completely avoidable with proper planning and the right tools.
              </p>

              <p className="leading-relaxed">
                Start by forecasting your next payout, setting realistic ad budgets, and separating business from personal finances. Then automate the tracking so you can focus on what matters: building a profitable, sustainable Amazon business.
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
                    <p className="text-xs text-muted-foreground">Learn the data-driven method to predict your next disbursement.</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/inventory-turnover-cashflow')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">Balance Reorders and Cashflow</h3>
                    <p className="text-xs text-muted-foreground">Master inventory timing with cashflow visibility.</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/blog/financing-growth')}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-sm">Use Cashflow Forecasts to Secure Financing</h3>
                    <p className="text-xs text-muted-foreground">Turn forecasts into better funding terms.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CTA */}
            <Card className="mt-12 bg-gradient-to-br from-primary/10 to-accent/10 border-none" style={{ borderRadius: "12px", marginTop: "3rem" }}>
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">Stop Making These Cashflow Mistakes</h3>
                <p className="text-muted-foreground">
                  Auren helps you avoid costly cashflow errors with automated forecasting, 
                  real-time payout tracking, and intelligent alerts.
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

export default ManageCashflow;
