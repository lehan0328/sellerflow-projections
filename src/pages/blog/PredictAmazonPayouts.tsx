import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const PredictAmazonPayouts = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
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

      {/* Article Header */}
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

            <Badge className="bg-blue-500/10 text-blue-600 mb-4">Cashflow</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              How to Predict Amazon Payouts Before They Happen
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-12">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>January 15, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>8 min read</span>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-xl text-muted-foreground leading-relaxed">
                As an Amazon seller, one of the most frustrating parts of running your business is not knowing exactly when your next payout will hit your bank account. Amazon&apos;s bi-weekly settlement schedule, combined with reserves, chargebacks, and fee adjustments, can make cashflow planning feel like guesswork.
              </p>

              <p className="leading-relaxed">
                But what if you could predict your Amazon payouts with 95% accuracy? What if you knew the exact date and amount weeks in advance? In this guide, we&apos;ll show you the proven strategies that successful sellers use to forecast their Amazon payouts and avoid cash shortfalls.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Understanding Amazon&apos;s Settlement Schedule</h2>
              
              <p className="leading-relaxed">
                Amazon typically disburses payments every 14 days, but the actual timing depends on several factors:
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Settlement period:</strong> Your sales are grouped into 14-day cycles</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Processing time:</strong> Amazon holds funds for 7 days after the settlement closes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Reserve holdbacks:</strong> Amazon may hold 3-5% of your sales as a reserve</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Adjustments:</strong> Chargebacks, refunds, and fee changes can alter final amounts</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">The 3-Step Forecasting Framework</h2>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 1: Track Your Historical Settlement Data</h3>
              
              <p className="leading-relaxed">
                Start by analyzing your past 6 months of Amazon settlements. Look for patterns in:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Average payout amounts per cycle</li>
                <li>Seasonal variations (Q4 vs Q1-Q3)</li>
                <li>Reserve hold percentages</li>
                <li>Fee structures and trends</li>
              </ul>

              <p className="leading-relaxed">
                This historical data becomes the foundation of your forecasting model. Most successful sellers maintain at least 6 months of clean data to ensure accuracy.
              </p>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 2: Account for Outstanding Orders</h3>

              <p className="leading-relaxed">
                Your next payout isn&apos;t just based on past sales—it includes orders that are currently being fulfilled. Calculate your pending settlement by adding:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Sales from the current 14-day period</li>
                <li>Expected refunds and returns</li>
                <li>Advertising costs that will be deducted</li>
                <li>FBA fees and storage charges</li>
              </ul>

              <h3 className="text-2xl font-semibold mt-8 mb-4">Step 3: Factor in Reserve Releases</h3>

              <p className="leading-relaxed">
                Amazon&apos;s reserve system can significantly impact your cashflow. Reserves are typically released after 7-14 days, but the timing varies. Track when reserves were withheld and when they&apos;re scheduled for release to get a complete picture of your incoming cash.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Tools That Make Forecasting Easier</h2>

              <p className="leading-relaxed">
                While you can forecast manually using spreadsheets, most 6- and 7-figure sellers use automated tools to save time and improve accuracy. Tools like Auren connect directly to your Amazon Seller Central account and automatically:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Pull settlement history and analyze patterns</li>
                <li>Calculate pending payouts based on current orders</li>
                <li>Track reserve holdbacks and release schedules</li>
                <li>Adjust forecasts based on fee changes and refunds</li>
              </ul>

              <p className="leading-relaxed">
                This automation eliminates manual data entry and reduces forecasting errors from 20-30% down to under 5%.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Common Forecasting Mistakes to Avoid</h2>

              <Card className="my-8 bg-destructive/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="leading-relaxed">
                    <strong>❌ Ignoring seasonal trends:</strong> Q4 payouts can be 3-5x higher than Q1. Don&apos;t use simple averages.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Forgetting about fee changes:</strong> Amazon regularly adjusts FBA fees. Factor these into your forecasts.
                  </p>
                  <p className="leading-relaxed">
                    <strong>❌ Not accounting for chargebacks:</strong> Credit card disputes can reduce your payout by 1-3%. Always include a buffer.
                  </p>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">Taking Action</h2>

              <p className="leading-relaxed">
                Accurate payout forecasting isn&apos;t just about knowing when money will arrive—it&apos;s about making better business decisions. When you can predict your cashflow with confidence, you can:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Time inventory purchases without risking liquidity</li>
                <li>Plan advertising budgets around available cash</li>
                <li>Avoid expensive overdraft fees and short-term loans</li>
                <li>Scale your business without cash flow anxiety</li>
              </ul>

              <p className="leading-relaxed">
                Start by implementing the 3-step framework outlined above. Track your data for 30 days and you&apos;ll already see improvements in forecasting accuracy.
              </p>
            </div>

            {/* CTA */}
            <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">
                  Want to Automate Your Payout Forecasting?
                </h3>
                <p className="text-muted-foreground">
                  Auren connects to your Amazon Seller Central account and forecasts every payout automatically. 
                  See exactly when cash will hit your account—weeks in advance.
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

export default PredictAmazonPayouts;
