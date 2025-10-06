import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const InventoryTurnoverCashflow = () => {
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
          "headline": "Balance Reorders and Cashflow: The Forecasting Framework for Sellers",
          "description": "Master the art of timing inventory purchases with your Amazon payout schedule to maintain optimal cashflow.",
          "author": { "@type": "Organization", "name": "Auren Team" },
          "publisher": { "@type": "Organization", "name": "Auren", "logo": { "@type": "ImageObject", "url": "https://aurenapp.com/assets/logo.png" } },
          "datePublished": "2025-01-02",
          "mainEntityOfPage": { "@type": "WebPage", "@id": "https://aurenapp.com/blog/inventory-turnover-cashflow" }
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

            <Badge className="bg-pink-500/10 text-pink-600 mb-4">Strategy</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Balance Reorders and Cashflow: The Forecasting Framework for Sellers
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-12">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>January 2, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>11 min read</span>
              </div>
            </div>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-xl text-muted-foreground leading-relaxed">
                Every Amazon seller faces the same dilemma: order inventory too early and you tie up cash you might need elsewhere. Order too late and you risk stockouts, lost sales, and damaged rankings. The key to solving this problem isn&apos;t just inventory management—it&apos;s understanding how inventory decisions impact your cashflow.
              </p>

              <p className="leading-relaxed">
                In this guide, we&apos;ll walk through a proven forecasting framework that helps you time inventory purchases perfectly, maintain healthy cashflow, and never run out of stock.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">The Cashflow-Inventory Conflict</h2>
              
              <p className="leading-relaxed">
                Here&apos;s the challenge: Your inventory is your single largest expense, but Amazon only pays you every 14 days. This creates a timing mismatch:
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>You pay your supplier <strong>today</strong> (or in 30-45 days with payment terms)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Your inventory takes 30-60 days to manufacture and ship</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>It takes another 14-30 days to sell through</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Amazon holds your money for 7+ days after the sale</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                This means you&apos;re investing cash 60-90 days before you see a return. Without proper forecasting, this cycle can drain your bank account—even if your business is profitable.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">The 4-Step Forecasting Framework</h2>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 1: Calculate Your Reorder Point</h3>
              
              <p className="leading-relaxed">
                Your reorder point is when you need to place your next order to avoid stockouts. The formula is:
              </p>

              <Card className="my-6 bg-accent/5">
                <CardContent className="pt-6">
                  <p className="font-mono text-center text-lg">
                    Reorder Point = (Daily Sales × Lead Time) + Safety Stock
                  </p>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                Example: If you sell 20 units/day, your lead time is 45 days, and you want 10 days of safety stock:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Daily Sales × Lead Time = 20 × 45 = 900 units</li>
                <li>Safety Stock = 20 × 10 = 200 units</li>
                <li><strong>Reorder Point = 1,100 units</strong></li>
              </ul>

              <p className="leading-relaxed">
                When your inventory drops to 1,100 units, it&apos;s time to reorder.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 2: Map Your Reorder Point to Your Cashflow Calendar</h3>

              <p className="leading-relaxed">
                Knowing when to reorder is only half the equation. You also need to know if you&apos;ll have the cash available when it&apos;s time to pay.
              </p>

              <p className="leading-relaxed">
                Create a simple timeline that shows:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>When you&apos;ll hit your reorder point (based on current sales velocity)</li>
                <li>When payment is due to your supplier</li>
                <li>When Amazon payouts will hit your account</li>
                <li>What other expenses are coming up (ads, storage fees, loan payments)</li>
              </ul>

              <Card className="my-8 bg-primary/5">
                <CardContent className="pt-6">
                  <p className="font-semibold mb-3">Example Cashflow Timeline:</p>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Today:</strong> 1,200 units in stock, $15k in bank</li>
                    <li><strong>Day 5:</strong> Amazon payout arrives (+$8k, total $23k)</li>
                    <li><strong>Day 6:</strong> Hit reorder point (1,100 units)</li>
                    <li><strong>Day 8:</strong> Supplier payment due (-$12k, total $11k)</li>
                    <li><strong>Day 12:</strong> Ad spend payment (-$3k, total $8k)</li>
                    <li><strong>Day 19:</strong> Next Amazon payout (+$9k, total $17k)</li>
                  </ul>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                In this example, you can comfortably pay the supplier on Day 8 because you received a payout on Day 5.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 3: Build in Cash Buffers</h3>

              <p className="leading-relaxed">
                Never plan to spend every dollar you have. Unexpected expenses (returns, chargebacks, ad spend spikes) can throw off your timing. A good rule of thumb:
              </p>

              <Card className="my-6">
                <CardContent className="pt-6 space-y-3">
                  <p className="flex items-start gap-3">
                    <span className="font-semibold">Buffer Level 1:</span>
                    <span>Keep 10-15% of monthly revenue in cash reserves</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="font-semibold">Buffer Level 2:</span>
                    <span>Maintain enough cash to cover 2 weeks of operations without new payouts</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="font-semibold">Buffer Level 3:</span>
                    <span>Have access to credit (business credit card or line of credit) for emergencies</span>
                  </p>
                </CardContent>
              </Card>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 4: Adjust for Seasonality</h3>

              <p className="leading-relaxed">
                Your reorder points need to change with demand. Q4 requires much more aggressive inventory planning than Q1. Update your forecasts monthly to account for:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Seasonal sales trends (back-to-school, holidays, summer)</li>
                <li>Promotional events (Prime Day, Black Friday)</li>
                <li>New product launches that pull cash away from existing SKUs</li>
                <li>Changes in lead times (Chinese New Year, supplier capacity)</li>
              </ul>

              <h2 className="text-3xl font-bold mt-12 mb-6">Advanced Strategy: Stagger Your Reorders</h2>

              <p className="leading-relaxed">
                If you have multiple SKUs, avoid ordering everything at once. Stagger your reorders so that:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Cash outflows are spread across multiple weeks</li>
                <li>You&apos;re not waiting on multiple shipments simultaneously</li>
                <li>You can adjust quantities based on recent performance</li>
              </ul>

              <Card className="my-8 bg-accent/5">
                <CardContent className="pt-6">
                  <p className="font-semibold mb-2">💡 Pro Tip:</p>
                  <p className="text-sm">
                    Order your best-selling SKUs first, mid-tier SKUs two weeks later, and slower-moving SKUs last. This ensures you never run out of your top revenue drivers while optimizing cashflow.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Common Mistakes to Avoid</h2>

              <Card className="my-8 bg-destructive/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="leading-relaxed">
                    <strong>❌ Ordering based on gut feeling instead of data:</strong> Use actual sales velocity, not optimistic projections.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Forgetting about Amazon&apos;s long-term storage fees:</strong> These kick in at 365 days. Don&apos;t over-order slow-moving SKUs.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Not accounting for payment terms:</strong> If you have 45-day payment terms, factor that into your cashflow timeline.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Ignoring reserve holdbacks:</strong> Amazon may hold 3-5% of your payouts. Plan for this.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Tools That Make This Easier</h2>

              <p className="leading-relaxed">
                You can manage this framework manually in spreadsheets, but most sellers at scale use automation. Tools like Auren automatically:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Track your inventory levels and calculate reorder points</li>
                <li>Map reorder timing to your Amazon payout schedule</li>
                <li>Show you how much cash you&apos;ll have available when supplier payments are due</li>
                <li>Alert you if you&apos;re about to have a cashflow shortfall</li>
              </ul>

              <p className="leading-relaxed">
                This eliminates guesswork and lets you focus on growing your business instead of managing spreadsheets.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Putting It All Together</h2>

              <p className="leading-relaxed">
                Balancing inventory and cashflow isn&apos;t about choosing one over the other—it&apos;s about timing. When you can forecast both your inventory needs and your cash position weeks in advance, you can:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Order inventory confidently, knowing you&apos;ll have the cash to pay</li>
                <li>Avoid stockouts without tying up unnecessary capital</li>
                <li>Negotiate better terms with suppliers (since you can plan payments ahead)</li>
                <li>Scale faster without constant cashflow anxiety</li>
              </ul>
            </div>

            <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">
                  Automate Your Inventory-Cashflow Planning
                </h3>
                <p className="text-muted-foreground">
                  Auren automatically maps your inventory reorder points to your Amazon payout schedule. 
                  Know exactly when you can afford your next order—without spreadsheets.
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

export default InventoryTurnoverCashflow;
