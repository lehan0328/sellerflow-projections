import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const ForecastAmazonPayouts = () => {
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

            <Badge className="bg-blue-500/10 text-blue-600 mb-4">Forecasting</Badge>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              How to Forecast Amazon Payouts with Accuracy
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-12">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>October 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>6 min read</span>
              </div>
            </div>

            <div className="prose prose-lg max-w-none space-y-6">
              <p className="text-xl text-muted-foreground leading-relaxed">
                Amazon sellers often struggle with unpredictable payout schedules. Between reserve holds, refunds, and disbursement delays, it can be hard to know when cash will actually reach your bank account. The solution lies in data-driven forecasting — predicting payout dates and amounts before they happen.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">1. Understand Amazon&apos;s Settlement Schedule</h2>
              
              <p className="leading-relaxed">
                Amazon pays most sellers every 14 days, but factors like reserve balances, refunds, and A-to-Z claims can delay or reduce disbursements. The first step in forecasting is understanding your specific payout cadence.
              </p>

              <Card className="my-8">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Amazon&apos;s standard payment cycle is every 14 days</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Reserve holds can delay 3-5% of your payouts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Processing time adds 3-5 business days from disbursement to bank deposit</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">2. Analyze Historical Data</h2>

              <p className="leading-relaxed">
                Look back at your past settlements — note when Amazon initiated transfers and how long they took to appear. Tracking this over 2–3 months reveals your true payout cycle. This data becomes the foundation for predictive modeling.
              </p>

              <p className="leading-relaxed">
                Most sellers discover patterns they never noticed before: payouts consistently arrive on Thursdays, reserves release on specific dates, or certain fee categories spike at month-end. These patterns are gold for forecasting.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">3. Factor in Sales Velocity and Fees</h2>

              <p className="leading-relaxed">
                Payouts aren&apos;t just time-based — they depend on net proceeds. High ad spend, restock fees, or returns reduce your available balance. Accurate forecasting means factoring in both inflows (sales) and outflows (fees and expenses).
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li><strong>Inflows:</strong> Product sales, refund reimbursements, promotional recoveries</li>
                <li><strong>Outflows:</strong> FBA fees, advertising costs, storage charges, refunds</li>
                <li><strong>Timing gaps:</strong> Sales happen today, but fees may be charged days later</li>
              </ul>

              <h2 className="text-3xl font-bold mt-12 mb-6">4. Automate Forecasting with Auren</h2>

              <p className="leading-relaxed">
                <strong>Auren</strong> connects directly to Amazon Seller Central through a secure read-only API and automatically forecasts future disbursements. It calculates expected payout amounts, reserve deductions, and dates — updating daily as your sales evolve.
              </p>

              <Card className="my-8 bg-primary/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="leading-relaxed">
                    Instead of manually tracking settlements in spreadsheets, Auren does it automatically. It learns your unique payout patterns and predicts:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">The exact date of your next payout</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">The expected amount after all fees and reserves</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">When reserve funds will be released</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">How upcoming expenses will impact available cash</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mt-12 mb-6">5. Use Forecasts to Plan Growth</h2>

              <p className="leading-relaxed">
                Knowing your next payout date gives you control over when to place inventory orders, pay suppliers, or scale ads. Instead of reacting to cash shortages, you can plan ahead with confidence.
              </p>

              <p className="leading-relaxed">
                Successful sellers use payout forecasts to:
              </p>

              <ul className="list-disc pl-6 space-y-2 my-6">
                <li>Time inventory purchases to align with incoming payouts</li>
                <li>Negotiate better payment terms with suppliers based on predictable cashflow</li>
                <li>Scale advertising confidently without risking liquidity</li>
                <li>Avoid expensive short-term financing by planning around payout cycles</li>
              </ul>

              <p className="leading-relaxed">
                Stop guessing when Amazon will pay you — start your free trial of Auren and forecast your next payout today.
              </p>
            </div>

            {/* Related Posts */}
            <Card className="mt-12 bg-muted/30">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Related Articles</h3>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="/blog/manage-cashflow" 
                      className="text-primary hover:underline"
                      onClick={(e) => { e.preventDefault(); navigate('/blog/manage-cashflow'); }}
                    >
                      5 Cashflow Mistakes Every Amazon Seller Should Avoid
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/blog/financing-growth" 
                      className="text-primary hover:underline"
                      onClick={(e) => { e.preventDefault(); navigate('/blog/financing-growth'); }}
                    >
                      How to Use Cashflow Forecasts to Secure Seller Financing
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/blog/predict-amazon-payouts" 
                      className="text-primary hover:underline"
                      onClick={(e) => { e.preventDefault(); navigate('/blog/predict-amazon-payouts'); }}
                    >
                      How to Predict Amazon Payouts Before They Happen
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">
                  Start Forecasting Your Payouts Today
                </h3>
                <p className="text-muted-foreground">
                  Auren automatically predicts your Amazon payouts with 95% accuracy. 
                  Connect your Seller Central account and see your next payout date in minutes.
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

export default ForecastAmazonPayouts;
