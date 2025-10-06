import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";

// Blog posts database - imported from BlogTemplate
const BLOG_POSTS = [
  {
    slug: "predict-amazon-payouts",
    title: "How to Predict Amazon Payouts Before They Happen",
    category: "Cashflow",
    categoryColor: "bg-blue-500/10 text-blue-600",
    publishDate: "January 15, 2025",
    readTime: "8",
    description: "Learn the proven strategies Amazon sellers use to forecast their payouts with 95% accuracy and avoid cash shortfalls.",
  },
  {
    slug: "seller-funding-forecast",
    title: "Use Forecasting Data to Qualify for Amazon Lending or 8fig Capital",
    category: "Financing",
    categoryColor: "bg-green-500/10 text-green-600",
    publishDate: "January 12, 2025",
    readTime: "10",
    description: "Discover how accurate cashflow forecasting can strengthen your loan applications and unlock better financing terms.",
  },
  {
    slug: "scaling-to-seven-figures",
    title: "How Cashflow Visibility Helps You Scale to 7 Figures",
    category: "Growth",
    categoryColor: "bg-purple-500/10 text-purple-600",
    publishDate: "January 8, 2025",
    readTime: "12",
    description: "Real stories from sellers who used cashflow forecasting to grow their Amazon business to 7 figures and beyond.",
  },
  {
    slug: "best-cashflow-tools",
    title: "Best Cashflow Tools for Marketplace Sellers in 2025",
    category: "Tools",
    categoryColor: "bg-orange-500/10 text-orange-600",
    publishDate: "January 5, 2025",
    readTime: "15",
    description: "A comprehensive comparison of the top cashflow management tools built specifically for Amazon and multi-channel sellers.",
  },
  {
    slug: "inventory-turnover-cashflow",
    title: "Balance Reorders and Cashflow: The Forecasting Framework for Sellers",
    category: "Strategy",
    categoryColor: "bg-pink-500/10 text-pink-600",
    publishDate: "January 2, 2025",
    readTime: "11",
    description: "Master the art of timing inventory purchases with your Amazon payout schedule to maintain optimal cashflow.",
  },
  {
    slug: "forecast-amazon-payouts",
    title: "How to Forecast Amazon Payouts with Accuracy",
    category: "Forecasting",
    categoryColor: "bg-blue-500/10 text-blue-600",
    publishDate: "October 2025",
    readTime: "6",
    description: "Learn how to forecast Amazon payouts accurately using data-driven models to predict disbursements, manage expenses, and plan growth confidently.",
  },
  {
    slug: "manage-cashflow",
    title: "5 Cashflow Mistakes Every Amazon Seller Should Avoid",
    category: "Management",
    categoryColor: "bg-red-500/10 text-red-600",
    publishDate: "October 2025",
    readTime: "7",
    description: "Avoid the most common Amazon cashflow mistakes — from overspending on ads to ignoring payout delays. Learn proven management strategies.",
  },
  {
    slug: "financing-growth",
    title: "How to Use Cashflow Forecasts to Secure Seller Financing",
    category: "Financing",
    categoryColor: "bg-green-500/10 text-green-600",
    publishDate: "October 2025",
    readTime: "8",
    description: "Learn how Amazon sellers can use cashflow forecasts to qualify for better funding and present predictable revenue to lenders.",
  },
];

const BlogTag = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();

  // Convert URL slug to display name
  const tagName = tag
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Filter posts by category (case-insensitive match)
  const tagPosts = BLOG_POSTS.filter(
    (post) => post.category.toLowerCase() === tag?.toLowerCase()
  );

  // Get category color from first post
  const categoryColor = tagPosts[0]?.categoryColor || "bg-primary/10 text-primary";

  if (!tagName || tagPosts.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Tag Not Found</h1>
          <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
        </div>
      </div>
    );
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${tagName} Articles | Auren Blog`,
    description: `All articles and insights about ${tagName} from Auren's blog.`,
    publisher: {
      "@type": "Organization",
      name: "Auren",
      url: "https://aurenapp.com",
      logo: {
        "@type": "ImageObject",
        url: "https://aurenapp.com/assets/logo.png",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Schema.org Structured Data */}
      <script type="application/ld+json">{JSON.stringify(schema)}</script>

      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer hover-scale transition-all duration-300"
              onClick={() => navigate("/")}
            >
              <img src={aurenIcon} alt="Auren" className="h-12 w-12" />
              <span className="text-2xl font-bold">Auren</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/blog")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </div>
        </div>
      </nav>

      {/* Tag Hero */}
      <section className="py-12 border-b bg-muted/30">
        <div className="container mx-auto px-6 max-w-4xl">
          <Badge className={`${categoryColor} mb-4`}>{tagName}</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">{tagName}</h1>
          <p className="text-lg text-muted-foreground">
            Explore all articles and insights from Auren related to{" "}
            <strong>{tagName}</strong>. Learn how to forecast Amazon payouts, improve
            cashflow visibility, and make smarter financial decisions.
          </p>
        </div>
      </section>

      {/* Article Grid */}
      <section className="py-12">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tagPosts.map((post) => (
              <Card
                key={post.slug}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 group"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <CardContent className="p-6">
                  <Badge className={`${post.categoryColor} mb-3`}>
                    {post.category}
                  </Badge>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {post.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {post.publishDate} • {post.readTime} min read
                  </p>
                  <Button
                    variant="link"
                    className="mt-4 p-0 h-auto text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/blog/${post.slug}`);
                    }}
                  >
                    Read More →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Master {tagName} with Auren</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Forecast your Amazon payouts, plan expenses, and stay ahead of cashflow
            challenges with Auren.
          </p>
          <Button
            size="lg"
            className="bg-gradient-primary font-bold"
            onClick={() => navigate("/")}
          >
            Start Free Trial
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
};

export default BlogTag;
