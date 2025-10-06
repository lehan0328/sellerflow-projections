import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, TrendingUp } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const ScalingToSevenFigures = () => {
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

      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/blog')}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>

            <Badge className="bg-purple-500/10 text-purple-600 mb-4">Growth</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              How Cashflow Visibility Helps You Scale to 7 Figures
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-12">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>January 8, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>12 min read</span>
              </div>
            </div>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-xl text-muted-foreground leading-relaxed">
                Growing an Amazon business from $50k/month to $100k/month is exciting. But scaling from $500k/month to 7 figures? That&apos;s when cashflow becomes the make-or-break factor. The difference between sellers who plateau and those who break through isn&apos;t just product selection or marketing—it&apos;s their ability to manage cashflow at scale.
              </p>

              <p className="leading-relaxed">
                In this guide, we&apos;ll share real stories from sellers who used cashflow visibility to reach 7 figures—and the specific strategies they used to get there.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">The Cashflow Trap at $500k/Month</h2>
              
              <p className="leading-relaxed">
                Most Amazon sellers hit their first major cashflow crisis around $40-60k/month in revenue. They solve it with external financing, better inventory planning, or reducing ad spend. But there&apos;s a second, more dangerous trap waiting at $500k/month.
              </p>

              <Card className="my-8 bg-destructive/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="leading-relaxed font-semibold">
                    The $500k Plateau
                  </p>
                  <p className="leading-relaxed text-sm">
                    At this level, your inventory requirements jump from $50k to $200k+. Your advertising budget doubles. You need to hire staff. Suddenly, you&apos;re managing multiple suppliers, multiple SKUs, and multiple payment schedules—all while Amazon&apos;s bi-weekly payouts stay exactly the same.
                  </p>
                  <p className="leading-relaxed text-sm">
                    Without clear cashflow visibility, sellers at this stage make one of two mistakes: they either over-invest (running out of cash before payouts arrive) or under-invest (missing growth opportunities because they think they can&apos;t afford them).
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Real Story: From $400k to $1.2M in 18 Months</h2>

              <p className="leading-relaxed">
                Marcus, a private-label supplement seller, was stuck at $400k/month for over a year. His problem wasn&apos;t demand—his products were selling well. His problem was cashflow timing.
              </p>

              <p className="leading-relaxed">
                He was placing inventory orders reactively, whenever cash was available, rather than strategically. This created a vicious cycle:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Inventory would run low because he couldn&apos;t afford to restock</li>
                <li>Sales would dip due to stockouts</li>
                <li>Lower sales meant smaller Amazon payouts</li>
                <li>Smaller payouts made it harder to restock</li>
              </ul>

              <p className="leading-relaxed">
                The breakthrough came when Marcus implemented daily cashflow visibility. He started using forecasting to answer three critical questions:
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>When will I have enough cash to place my next inventory order?</strong> (Not just total sales, but actual available cash)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>How much can I safely spend on ads this week without risking a shortfall?</strong> (Factoring in upcoming supplier payments)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Should I use external financing, or do I have enough runway to self-fund?</strong> (Understanding true liquidity needs)</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              <p className="leading-relaxed">
                With these answers, Marcus restructured his entire operation:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>He shifted from reactive reorders to proactive inventory planning, timing orders with Amazon payout cycles</li>
                <li>He negotiated 45-day payment terms with his manufacturers, giving him more cashflow flexibility</li>
                <li>He used short-term financing strategically—only for high-ROI opportunities, not to cover shortfalls</li>
              </ul>

              <p className="leading-relaxed">
                Result: Within 18 months, he scaled from $400k/month to $1.2M/month—without ever running out of cash.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">The 5 Cashflow Principles of 7-Figure Sellers</h2>

              <p className="leading-relaxed">
                After interviewing dozens of sellers who&apos;ve crossed the 7-figure threshold, we identified five common cashflow principles:
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">1. They Forecast 90 Days Ahead, Not 14 Days</h3>
              
              <p className="leading-relaxed">
                Smaller sellers focus on their next payout. Seven-figure sellers are already planning Q4 inventory purchases in June. They use rolling 90-day forecasts to identify cash gaps months before they happen.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">2. They Separate &quot;Revenue&quot; from &quot;Available Cash&quot;</h3>

              <p className="leading-relaxed">
                Just because you made $100k in sales doesn&apos;t mean you have $100k to spend. After Amazon fees, COGS, advertising, and reserves, your actual available cash might be $30k. Successful sellers track this distinction obsessively.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">3. They Use Financing Strategically, Not Reactively</h3>

              <p className="leading-relaxed">
                Seven-figure sellers don&apos;t borrow money because they&apos;re desperate—they borrow to accelerate growth during high-ROI opportunities. They secure financing when they don&apos;t need it, so it&apos;s available when they do.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">4. They Build 30-Day Cash Buffers</h3>

              <p className="leading-relaxed">
                Operating with zero margin for error is risky at scale. Most 7-figure sellers maintain a 30-day cash buffer—enough to cover one full operating cycle without relying on Amazon payouts.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">5. They Automate Cashflow Tracking</h3>

              <p className="leading-relaxed">
                No 7-figure seller manages cashflow in spreadsheets. They use tools that automatically sync Amazon data, calculate forecasts, and alert them to potential shortfalls. This frees up mental bandwidth for growth decisions.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Common Scaling Mistakes That Kill Cashflow</h2>

              <Card className="my-8 bg-destructive/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="leading-relaxed">
                    <strong>❌ Launching too many SKUs too fast:</strong> Each new SKU requires inventory investment. Launch strategically, not impulsively.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Ignoring seasonal cash needs:</strong> Q4 can require 3-5x your normal inventory investment. Plan for it in Q2.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Using high-interest short-term loans repeatedly:</strong> If you&apos;re constantly borrowing at 20%+ APR, your unit economics are broken.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Treating all growth opportunities equally:</strong> Some investments have 3x ROI, others lose money. Cashflow visibility helps you identify the difference.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Your Roadmap to 7 Figures</h2>

              <p className="leading-relaxed">
                If you&apos;re currently at $40-60k/month and want to reach 7 figures, here&apos;s your cashflow roadmap:
              </p>

              <ol className="list-decimal pl-6 space-y-3 my-6">
                <li><strong>Build forecasting discipline now</strong> — Start tracking forecasts vs actuals monthly</li>
                <li><strong>Establish 90-day visibility</strong> — Can you see your cash position 3 months out?</li>
                <li><strong>Negotiate supplier terms</strong> — Extend payment terms to 45-60 days where possible</li>
                <li><strong>Build a 30-day buffer</strong> — Before scaling aggressively, ensure you have runway</li>
                <li><strong>Automate your tracking</strong> — Use tools like Auren to eliminate manual cashflow management</li>
              </ol>

              <p className="leading-relaxed">
                Scaling to 7 figures isn&apos;t about luck—it&apos;s about systems. And cashflow visibility is the most important system you can build.
              </p>
            </div>

            <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">
                  Ready to Scale with Confidence?
                </h3>
                <p className="text-muted-foreground">
                  Auren gives you the 90-day cashflow visibility that 7-figure sellers rely on. 
                  See exactly when you can afford your next inventory order, ad spend increase, or product launch.
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

export default ScalingToSevenFigures;
