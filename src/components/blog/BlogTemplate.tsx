import { ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";

interface BlogTemplateProps {
  title: string;
  category: string;
  categoryColor: string;
  publishDate: string;
  readTime: string;
  description: string;
  slug: string;
  children: ReactNode;
}

// Blog posts database with all metadata
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

// Get related articles by excluding current post and returning 3 others
const getRelatedArticles = (currentSlug: string) => {
  return BLOG_POSTS
    .filter(post => post.slug !== currentSlug)
    .slice(0, 3)
    .map(post => ({
      title: post.title,
      slug: `/blog/${post.slug}`,
      description: post.description,
    }));
};

export const BlogTemplate = ({
  title,
  category,
  categoryColor,
  publishDate,
  readTime,
  description,
  slug,
  children,
}: BlogTemplateProps) => {
  const navigate = useNavigate();
  
  // Auto-generate schema from props
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "author": { "@type": "Organization", "name": "Auren Team" },
    "publisher": { 
      "@type": "Organization", 
      "name": "Auren", 
      "logo": { 
        "@type": "ImageObject", 
        "url": "https://aurenapp.com/assets/logo.png" 
      } 
    },
    "datePublished": publishDate,
    "mainEntityOfPage": { 
      "@type": "WebPage", 
      "@id": `https://aurenapp.com/blog/${slug}` 
    }
  };
  
  // Auto-populate related articles
  const relatedArticles = getRelatedArticles(slug);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} | Auren Blog</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://aurenapp.com/blog/${slug}`} />
        <meta property="og:title" content={`${title} | Auren Blog`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://aurenapp.com/blog/${slug}`} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${title} | Auren Blog`} />
        <meta name="twitter:description" content={description} />
      </Helmet>
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

      {/* Article */}
      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto" style={{ maxWidth: "780px" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/blog")}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>

            <Badge className={categoryColor + " mb-4"}>{category}</Badge>

            <h1 className="text-4xl lg:text-5xl font-bold mb-6">{title}</h1>

            <p className="text-sm text-muted-foreground mb-8" style={{ color: "#6b7280" }}>
              Published {publishDate} • {readTime} min read
            </p>

            {/* Article Content */}
            <div className="space-y-6" style={{ fontSize: "17px", lineHeight: "1.75" }}>
              {children}
            </div>

            {/* CTA Section */}
            <Card
              className="mt-12 bg-gradient-to-br from-primary/10 to-accent/10 border-none"
              style={{ borderRadius: "12px", marginTop: "3rem" }}
            >
              <CardContent className="p-8 text-center space-y-4" style={{ padding: "2rem" }}>
                <h2 className="text-2xl font-bold">
                  Predict Your Next Amazon Payout Today
                </h2>
                <p className="text-muted-foreground">
                  Join hundreds of Amazon sellers who use Auren to forecast payouts, plan
                  cashflow, and scale confidently.
                </p>
                <Button
                  size="lg"
                  className="bg-gradient-primary font-bold"
                  onClick={() => navigate("/")}
                  style={{ borderRadius: "0.5rem" }}
                >
                  Start Free Trial
                </Button>
                <p className="text-sm text-muted-foreground">
                  No credit card required • Cancel anytime
                </p>
              </CardContent>
            </Card>

            {/* Author Bio */}
            <Card
              className="mt-12 bg-muted/30"
              style={{ borderRadius: "12px", marginTop: "3rem", padding: "1.5rem" }}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-3">About the Author</h3>
                <p className="leading-relaxed mb-2" style={{ lineHeight: "1.75" }}>
                  <strong>The Auren Team</strong> helps Amazon and eCommerce sellers master
                  cashflow forecasting and make smarter financial decisions. We&apos;re on a
                  mission to make business cash management simple, automated, and
                  stress-free.
                </p>
                <p className="text-sm">
                  Learn more at{" "}
                  <a href="/" className="text-primary hover:underline">
                    aurenapp.com
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Tags */}
            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">Tags:</p>
              <div className="flex gap-2">
                <Badge 
                  className={`${categoryColor} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => navigate(`/blog/tag/${category.toLowerCase()}`)}
                >
                  {category}
                </Badge>
              </div>
            </div>

            {/* Related Articles */}
            <div className="mt-12" style={{ marginTop: "3rem" }}>
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid gap-6 md:grid-cols-3" style={{ gap: "1.5rem" }}>
                {relatedArticles.map((article, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300"
                    onClick={() => navigate(article.slug)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 text-sm hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{article.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};
