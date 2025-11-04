import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  FileText,
  ShoppingCart,
  Users,
  CreditCard,
  TrendingUp,
  Link as LinkIcon,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const Guides = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🎯 Guides page mounted successfully!");
  }, []);

  type Guide = string | { title: string; path: string };
  
  const guideSections = [
    {
      title: "Income & Expenses",
      description: "Managing your business income and expenses",
      icon: <TrendingUp className="h-6 w-6" />,
      path: "/guides/income-expenses",
      guides: [
        {
          title: "Manually Adding a Purchase Order",
          path: "/guides/purchase-orders"
        },
        {
          title: "AI PO autofill (Growing+ plans only)",
          path: "/guides/ai-po-autofill"
        },
        "Tracking Expenses",
        "Categorizing Transactions"
      ]
    },
    {
      title: "Vendor Management",
      description: "Managing your suppliers and vendors",
      icon: <Users className="h-6 w-6" />,
      path: "/guides/vendors",
      guides: [
        "Adding New Vendors",
        "Setting Payment Terms",
        "Vendor Communication"
      ]
    },
    {
      title: "Amazon Operations",
      description: "Working with Amazon data and forecasts",
      icon: <ShoppingCart className="h-6 w-6" />,
      path: "/guides/amazon",
      guides: [
        "Reading Payout Forecasts",
        "Understanding Settlement Reports",
        "Multi-Marketplace Management"
      ]
    },
    {
      title: "Bank Accounts",
      description: "Managing bank connections and transactions",
      icon: <CreditCard className="h-6 w-6" />,
      path: "/guides/bank-accounts",
      guides: [
        "Connecting Bank Accounts",
        "Reviewing Transactions",
        "Categorizing Expenses"
      ]
    },
    {
      title: "Cash Flow Analysis",
      description: "Understanding your cash flow forecasts",
      icon: <FileText className="h-6 w-6" />,
      path: "/guides/cash-flow",
      guides: [
        "Reading the Dashboard",
        "Safe Spending Calculator",
        "90-Day Forecast"
      ]
    }
  ];

  const filteredSections = guideSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.guides.some(guide => {
      const guideTitle = typeof guide === 'string' ? guide : guide.title;
      return guideTitle.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <SidebarInset className="flex-1 bg-background">
          <Helmet>
            <title>Guides - Auren</title>
            <meta name="description" content="Step-by-step guides for using Auren's features" />
          </Helmet>

          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">Guides</h1>
          </header>

          <div className="container mx-auto px-6 py-8 bg-background">
            <div className="max-w-6xl mx-auto bg-background">
              {/* Search Bar */}
              <div className="mb-8">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guides..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Hero Section */}
              <div className="space-y-4 mb-12">
                <h2 className="text-3xl font-bold">
                  Step-by-Step Guides
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Learn how to use Auren's features with detailed, visual step-by-step guides
                </p>
              </div>

              <Separator className="my-8" />

              {/* Guide Sections */}
              <div className="space-y-8">
                <h3 className="text-2xl font-bold">Browse by Category</h3>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredSections.map((section, index) => (
                    <Card 
                      key={index} 
                      className="shadow-card hover:shadow-elevated transition-all duration-300 hover-scale animate-fade-in" 
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {section.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <ul className="space-y-2">
                          {section.guides.map((guide, guideIndex) => {
                            const isGuideObject = typeof guide === 'object' && guide !== null && 'title' in guide;
                            const guideTitle: string = isGuideObject ? (guide as { title: string; path: string }).title : (guide as string);
                            const guidePath = isGuideObject ? (guide as { title: string; path: string }).path : `${section.path}#${(guide as string).toLowerCase().replace(/\s+/g, '-')}`;
                            
                            return (
                              <li key={guideIndex}>
                                <Link 
                                  to={guidePath}
                                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group"
                                >
                                  <span>{guideTitle}</span>
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {searchTerm && filteredSections.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try searching with different keywords or browse our categories above.
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Clear Search
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Guides;
