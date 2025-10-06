import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";

interface BlogTemplateProps {
  title: string;
  category: string;
  categoryColor: string;
  publishDate: string;
  readTime: string;
  description: string;
  children: ReactNode;
  schema: object;
  relatedArticles?: {
    title: string;
    slug: string;
    description: string;
  }[];
}

export const BlogTemplate = ({
  title,
  category,
  categoryColor,
  publishDate,
  readTime,
  description,
  children,
  schema,
  relatedArticles = [
    {
      title: "How to Forecast Amazon Payouts with Accuracy",
      slug: "/blog/forecast-amazon-payouts",
      description: "Learn the data-driven method to predict your next disbursement.",
    },
    {
      title: "5 Cashflow Mistakes Every Amazon Seller Should Avoid",
      slug: "/blog/manage-cashflow",
      description: "Avoid common cashflow traps and keep your business liquid.",
    },
    {
      title: "Use Forecasting Data to Qualify for Amazon Lending",
      slug: "/blog/financing-growth",
      description: "Turn your forecasts into financial leverage for growth.",
    },
  ],
}: BlogTemplateProps) => {
  const navigate = useNavigate();

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
