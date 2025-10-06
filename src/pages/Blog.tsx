import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

const Blog = () => {
  const navigate = useNavigate();

  const blogPosts = [
    {
      slug: "forecast-amazon-payouts",
      title: "How to Forecast Amazon Payouts with Accuracy",
      category: "Forecasting",
      excerpt: "Learn how to forecast Amazon payouts accurately using data-driven models. Predict disbursements, manage expenses, and plan growth confidently.",
      readTime: "6 min read",
      date: "October 2025",
      color: "bg-blue-500/10 text-blue-600"
    },
    {
      slug: "manage-cashflow",
      title: "5 Cashflow Mistakes Every Amazon Seller Should Avoid",
      category: "Management",
      excerpt: "Avoid the most common Amazon cashflow mistakes — from overspending on ads to ignoring payout delays. Learn proven management strategies.",
      readTime: "7 min read",
      date: "October 2025",
      color: "bg-red-500/10 text-red-600"
    },
    {
      slug: "financing-growth",
      title: "How to Use Cashflow Forecasts to Secure Seller Financing",
      category: "Financing",
      excerpt: "Learn how Amazon sellers can use cashflow forecasts to qualify for better funding and present predictable revenue to lenders.",
      readTime: "8 min read",
      date: "October 2025",
      color: "bg-green-500/10 text-green-600"
    },
    {
      slug: "predict-amazon-payouts",
      title: "How to Predict Amazon Payouts Before They Happen",
      category: "Cashflow",
      excerpt: "Learn the proven strategies Amazon sellers use to forecast their payouts with 95% accuracy and avoid cash shortfalls.",
      readTime: "8 min read",
      date: "January 15, 2025",
      color: "bg-blue-500/10 text-blue-600"
    },
    {
      slug: "seller-funding-forecast",
      title: "Use Forecasting Data to Qualify for Amazon Lending or 8fig Capital",
      category: "Financing",
      excerpt: "Discover how accurate cashflow forecasting can strengthen your loan applications and unlock better financing terms.",
      readTime: "10 min read",
      date: "January 12, 2025",
      color: "bg-green-500/10 text-green-600"
    },
    {
      slug: "scaling-to-seven-figures",
      title: "How Cashflow Visibility Helps You Scale to 7 Figures",
      category: "Growth",
      excerpt: "Real stories from sellers who used cashflow forecasting to grow their Amazon business to 7 figures and beyond.",
      readTime: "12 min read",
      date: "January 8, 2025",
      color: "bg-purple-500/10 text-purple-600"
    },
    {
      slug: "best-cashflow-tools",
      title: "Best Cashflow Tools for Marketplace Sellers in 2025",
      category: "Tools",
      excerpt: "A comprehensive comparison of the top cashflow management tools built specifically for Amazon and multi-channel sellers.",
      readTime: "15 min read",
      date: "January 5, 2025",
      color: "bg-orange-500/10 text-orange-600"
    },
    {
      slug: "inventory-turnover-cashflow",
      title: "Balance Reorders and Cashflow: The Forecasting Framework for Sellers",
      category: "Strategy",
      excerpt: "Master the art of timing inventory purchases with your Amazon payout schedule to maintain optimal cashflow.",
      readTime: "11 min read",
      date: "January 2, 2025",
      color: "bg-pink-500/10 text-pink-600"
    }
  ];

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
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-all duration-300">
                Home
              </Link>
              <Button size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge className="bg-gradient-primary">Amazon Seller Resources</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold">
              Master Your Amazon Cashflow
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert guides, strategies, and insights to help you forecast payouts, 
              manage expenses, and scale your marketplace business.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {blogPosts.map((post, index) => (
              <Card 
                key={index} 
                className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={post.color}>
                      {post.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{post.date}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="group-hover:text-primary"
                    >
                      Read More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold">
            Ready to Take Control of Your Cashflow?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Stop guessing when your next Amazon payout will arrive. Start forecasting with confidence.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/')}
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Blog;
